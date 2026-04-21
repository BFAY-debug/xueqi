# 好友系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为学栖平台添加完整的好友系统——好友申请/接受/拒绝、仅好友可私聊、用户资料卡弹窗、黑名单、删除好友，UI 整合到消息页三栏 Tab。

**Architecture:** 好友关系存储在 user-service 的 MySQL 中，通过 Redis SET 缓存供 study-service 校验。实时事件通过 Redis Pub/Sub 从 user-service 传递到 study-service 的 Socket.IO。

**Tech Stack:** MySQL 8, Redis, Express, Socket.IO, Vue 3 + Pinia

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `database/init/06-friend-system.sql` | friend_requests, friendships, blocks 三张表 |
| `services/user-service/src/services/friendService.js` | 好友业务逻辑 + Redis 缓存 |
| `services/user-service/src/controllers/friendController.js` | HTTP 端点处理 |
| `services/user-service/src/routes/friends.js` | 路由定义 |
| `frontend/src/api/friend.js` | 好友相关 API 调用 |
| `frontend/src/stores/friend.js` | Pinia 好友状态管理 |
| `frontend/src/components/UserProfileCard.vue` | 用户资料卡弹窗组件 |

### Modified Files
| File | Change |
|------|--------|
| `services/user-service/src/app.js` | 注册好友路由 |
| `services/study-service/src/socket.js` | pm:send 增加好友/黑名单校验 + Redis Pub/Sub |
| `services/study-service/src/services/privateChatService.js` | getOrCreateConversation 增加好友校验 |
| `services/study-service/src/controllers/privateChatController.js` | createConversation 增加好友校验 |
| `frontend/src/views/MessagesPage.vue` | 改为三 Tab（消息/好友/申请） |
| `frontend/src/views/ChatPage.vue` | 添加 pm:error 监听 + 好友管理菜单 |
| `frontend/src/components/UserAvatar.vue` | 添加 clickable/userId props |
| `frontend/src/components/AppNavbar.vue` | 合并好友申请未读数 |
| `frontend/src/views/StudyRoomsPage.vue` | 头像点击打开资料卡 |
| `frontend/src/views/CommunityPage.vue` | 头像点击打开资料卡 |
| `frontend/src/views/LeaderboardPage.vue` | 头像点击打开资料卡 |

---

## Task 1: Database Migration

**Files:**
- Create: `database/init/06-friend-system.sql`

- [ ] **Step 1: Create the SQL migration file**

```sql
SET NAMES utf8mb4;
USE xueqi_db;

-- ----------------------------------------------------------
-- 好友申请
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    sender_id    INT NOT NULL,
    receiver_id  INT NOT NULL,
    message      VARCHAR(200) DEFAULT NULL COMMENT 'optional note',
    status       ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pair (sender_id, receiver_id),
    INDEX idx_receiver_status (receiver_id, status, created_at DESC),
    INDEX idx_sender_status (sender_id, status),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 好友关系（user1_id < user2_id，与 conversations 表一致）
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS friendships (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    user1_id   INT NOT NULL COMMENT 'smaller user id',
    user2_id   INT NOT NULL COMMENT 'larger user id',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users (user1_id, user2_id),
    INDEX idx_user1 (user1_id),
    INDEX idx_user2 (user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 黑名单
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    blocker_id INT NOT NULL,
    blocked_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_blocker_blocked (blocker_id, blocked_id),
    INDEX idx_blocked (blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

- [ ] **Step 2: Verify syntax**

Run: `docker compose exec mysql mysql -uroot -p123456 xueqi_db < database/init/06-friend-system.sql`（或等容器重建时自动执行）

- [ ] **Step 3: Commit**

```bash
git add database/init/06-friend-system.sql
git commit -m "feat: add friend system database tables (friend_requests, friendships, blocks)"
```

---

## Task 2: Backend — friendService

**Files:**
- Create: `services/user-service/src/services/friendService.js`

- [ ] **Step 1: Create friendService.js**

```javascript
const { db, redis, logger } = require('xueqi-shared');
const notificationService = require('./notificationService');

const FRIEND_PREFIX = 'friends:';
const BLOCK_PREFIX = 'blocks:';

// --- Helper ---

function friendKey(userId) { return FRIEND_PREFIX + userId; }
function blockKey(userId) { return BLOCK_PREFIX + userId; }
function normalizeIds(id1, id2) { return id1 < id2 ? [id1, id2] : [id2, id1]; }

// --- Send Request ---

async function sendRequest(senderId, receiverId, message) {
  if (senderId === receiverId) throw new Error('不能添加自己为好友');

  // Check receiver exists and is active
  const [users] = await db.execute('SELECT id FROM users WHERE id = ? AND status = 1', [receiverId]);
  if (!users.length) throw new Error('用户不存在');

  // Check block (both directions)
  const [blocks] = await db.execute(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [senderId, receiverId, receiverId, senderId]
  );
  if (blocks.length) throw new Error('无法发送好友申请');

  // Check existing friendship
  const [small, large] = normalizeIds(senderId, receiverId);
  const [friends] = await db.execute('SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?', [small, large]);
  if (friends.length) throw new Error('已经是好友');

  // Check existing request (either direction)
  const [existing] = await db.execute(
    `SELECT id, status, sender_id, receiver_id FROM friend_requests
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
    [senderId, receiverId, receiverId, senderId]
  );

  for (const req of existing) {
    if (req.status === 'pending') {
      // If the other person sent us a pending request, auto-accept
      if (req.sender_id !== senderId) {
        return await acceptRequest(req.id, senderId);
      }
      throw new Error('已发送过好友申请');
    }
  }

  // Delete old rejected requests to allow re-send
  if (existing.length) {
    await db.execute(
      `DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [senderId, receiverId, receiverId, senderId]
    );
  }

  // Insert request
  const [result] = await db.execute(
    'INSERT INTO friend_requests (sender_id, receiver_id, message) VALUES (?, ?, ?)',
    [senderId, receiverId, message || null]
  );

  // Get sender info for notification
  const [senderRows] = await db.execute('SELECT nickname FROM users WHERE id = ?', [senderId]);
  const senderName = senderRows[0]?.nickname || '用户';

  await notificationService.createNotification({
    userId: receiverId,
    type: 'friend_request',
    title: '好友申请',
    content: `${senderName} 请求添加你为好友`,
    relatedId: result.insertId,
    relatedType: 'friend_request'
  });

  // Publish event for real-time
  await publishFriendEvent('friend_request', {
    requestId: result.insertId,
    toUserId: receiverId,
    fromUserId: senderId,
    fromNickname: senderName,
    fromAvatar: (await db.execute('SELECT avatar_url FROM users WHERE id = ?', [senderId]))[0][0]?.avatar_url || null
  });

  return { id: result.insertId, status: 'pending' };
}

// --- Accept Request ---

async function acceptRequest(requestId, userId) {
  const [rows] = await db.execute(
    'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = \'pending\'',
    [requestId, userId]
  );
  if (!rows.length) throw new Error('申请不存在或已处理');

  const req = rows[0];

  // Update request status
  await db.execute('UPDATE friend_requests SET status = \'accepted\' WHERE id = ?', [requestId]);

  // Create friendship
  const [small, large] = normalizeIds(req.sender_id, req.receiver_id);
  await db.execute(
    'INSERT IGNORE INTO friendships (user1_id, user2_id) VALUES (?, ?)',
    [small, large]
  );

  // Update Redis
  try {
    await redis.sadd(friendKey(req.sender_id), req.receiver_id);
    await redis.sadd(friendKey(req.receiver_id), req.sender_id);
  } catch (e) { logger.warn(`Redis friend cache update failed: ${e.message}`); }

  // Create or get conversation
  const [convRows] = await db.execute(
    'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  let conversationId;
  if (convRows.length) {
    conversationId = convRows[0].id;
  } else {
    const [convResult] = await db.execute(
      'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
      [small, large]
    );
    conversationId = convResult.insertId;
  }

  // Notify sender
  const [receiverRows] = await db.execute('SELECT nickname FROM users WHERE id = ?', [userId]);
  const receiverName = receiverRows[0]?.nickname || '用户';

  await notificationService.createNotification({
    userId: req.sender_id,
    type: 'friend_accepted',
    title: '好友通过',
    content: `${receiverName} 接受了你的好友申请`,
    relatedId: requestId,
    relatedType: 'friend_request'
  });

  await publishFriendEvent('friend_accepted', {
    toUserId: req.sender_id,
    acceptedByUserId: userId,
    acceptedByNickname: receiverName,
    conversationId
  });

  return { friendshipId: true, conversationId };
}

// --- Reject Request ---

async function rejectRequest(requestId, userId) {
  const [result] = await db.execute(
    'UPDATE friend_requests SET status = \'rejected\' WHERE id = ? AND receiver_id = ? AND status = \'pending\'',
    [requestId, userId]
  );
  if (!result.affectedRows) throw new Error('申请不存在或已处理');
  return true;
}

// --- Delete Friend ---

async function deleteFriend(userId, friendId) {
  const [small, large] = normalizeIds(userId, friendId);
  const [result] = await db.execute(
    'DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  if (!result.affectedRows) throw new Error('好友关系不存在');

  try {
    await redis.srem(friendKey(userId), friendId);
    await redis.srem(friendKey(friendId), userId);
  } catch (e) { logger.warn(`Redis friend cache update failed: ${e.message}`); }

  return true;
}

// --- Block / Unblock ---

async function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) throw new Error('不能拉黑自己');

  // Auto unfriend
  const [small, large] = normalizeIds(blockerId, blockedId);
  await db.execute('DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?', [small, large]);

  try {
    await redis.srem(friendKey(blockerId), blockedId);
    await redis.srem(friendKey(blockedId), blockerId);
  } catch (e) { /* ignore */ }

  // Reject any pending requests between them
  await db.execute(
    `UPDATE friend_requests SET status = 'rejected'
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'`,
    [blockerId, blockedId, blockedId, blockerId]
  );

  await db.execute(
    'INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
    [blockerId, blockedId]
  );

  try { await redis.sadd(blockKey(blockerId), blockedId); } catch (e) { /* ignore */ }

  return true;
}

async function unblockUser(blockerId, blockedId) {
  const [result] = await db.execute(
    'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [blockerId, blockedId]
  );
  if (!result.affectedRows) throw new Error('未拉黑该用户');
  try { await redis.srem(blockKey(blockerId), blockedId); } catch (e) { /* ignore */ }
  return true;
}

// --- Queries ---

async function getFriends(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const [rows] = await db.execute(
    `SELECT u.id, u.nickname, u.avatar_url, u.bio
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user1_id = ? THEN f.user2_id ELSE f.user1_id END
     WHERE (f.user1_id = ? OR f.user2_id = ?)
     ORDER BY u.nickname
     LIMIT ? OFFSET ?`,
    [userId, userId, userId, pageSize, offset]
  );
  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM friendships WHERE user1_id = ? OR user2_id = ?',
    [userId, userId]
  );
  return { data: rows, total: countRows[0].total };
}

async function getFriendRequests(userId, type = 'incoming', page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  let query, params;
  if (type === 'incoming') {
    query = `SELECT fr.*, u.nickname AS from_nickname, u.avatar_url AS from_avatar
             FROM friend_requests fr JOIN users u ON u.id = fr.sender_id
             WHERE fr.receiver_id = ? AND fr.status = 'pending'
             ORDER BY fr.created_at DESC LIMIT ? OFFSET ?`;
    params = [userId, pageSize, offset];
  } else {
    query = `SELECT fr.*, u.nickname AS to_nickname, u.avatar_url AS to_avatar
             FROM friend_requests fr JOIN users u ON u.id = fr.receiver_id
             WHERE fr.sender_id = ? AND fr.status IN ('pending', 'rejected')
             ORDER BY fr.created_at DESC LIMIT ? OFFSET ?`;
    params = [userId, pageSize, offset];
  }
  const [rows] = await db.execute(query, params);
  return { data: rows, total: rows.length };
}

async function getFriendStatus(myUserId, targetUserId) {
  if (myUserId === targetUserId) return 'self';

  const [small, large] = normalizeIds(myUserId, targetUserId);

  // Check friendship
  const [friends] = await db.execute('SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?', [small, large]);
  if (friends.length) return 'friend';

  // Check blocks (both directions)
  const [blocks] = await db.execute(
    'SELECT blocker_id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [myUserId, targetUserId, targetUserId, myUserId]
  );
  for (const b of blocks) {
    if (b.blocker_id === myUserId) return 'blocked';
    return 'blocked_by';
  }

  // Check requests
  const [reqs] = await db.execute(
    `SELECT sender_id, status FROM friend_requests
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'`,
    [myUserId, targetUserId, targetUserId, myUserId]
  );
  for (const r of reqs) {
    if (r.sender_id === myUserId) return 'request_sent';
    return 'request_received';
  }

  return 'none';
}

async function getUnreadRequestCount(userId) {
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS count FROM friend_requests WHERE receiver_id = ? AND status = \'pending\'',
    [userId]
  );
  return rows[0].count;
}

// --- Internal: for cross-service checks ---

async function areFriends(userId1, userId2) {
  const [small, large] = normalizeIds(userId1, userId2);
  const [rows] = await db.execute('SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?', [small, large]);
  return rows.length > 0;
}

async function isBlocked(userId, targetUserId) {
  const [rows] = await db.execute(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [userId, targetUserId, targetUserId, userId]
  );
  return rows.length > 0;
}

async function getBlockedUsers(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const [rows] = await db.execute(
    `SELECT u.id, u.nickname, u.avatar_url, b.created_at AS blocked_at
     FROM blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ? ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  return { data: rows, total: rows.length };
}

// --- Redis Pub/Sub helper ---

async function publishFriendEvent(type, data) {
  try {
    await redis.publish('xueqi:friend_events', JSON.stringify({ type, ...data }));
  } catch (e) { logger.warn(`Redis publish friend event failed: ${e.message}`); }
}

module.exports = {
  sendRequest, acceptRequest, rejectRequest, deleteFriend,
  blockUser, unblockUser, getFriends, getFriendRequests,
  getFriendStatus, getUnreadRequestCount, areFriends, isBlocked,
  getBlockedUsers
};
```

- [ ] **Step 2: Commit**

```bash
git add services/user-service/src/services/friendService.js
git commit -m "feat: add friendService with request, block, and Redis caching"
```

---

## Task 3: Backend — friendController + Routes

**Files:**
- Create: `services/user-service/src/controllers/friendController.js`
- Create: `services/user-service/src/routes/friends.js`
- Modify: `services/user-service/src/app.js`

- [ ] **Step 1: Create friendController.js**

```javascript
const friendService = require('../services/friendService');
const { logger } = require('xueqi-shared');

async function sendRequest(req, res, next) {
  try {
    const { toUserId, message } = req.body;
    if (!toUserId) return res.error('缺少目标用户ID', 400);
    const result = await friendService.sendRequest(req.user.userId, toUserId, message);
    res.success(result);
  } catch (err) {
    logger.error(`Send friend request failed: ${err.message}`);
    res.error(err.message, 400);
  }
}

async function acceptRequest(req, res, next) {
  try {
    const result = await friendService.acceptRequest(parseInt(req.params.id, 10), req.user.userId);
    res.success(result);
  } catch (err) {
    logger.error(`Accept friend request failed: ${err.message}`);
    res.error(err.message, 400);
  }
}

async function rejectRequest(req, res, next) {
  try {
    await friendService.rejectRequest(parseInt(req.params.id, 10), req.user.userId);
    res.success(null, '已拒绝');
  } catch (err) {
    logger.error(`Reject friend request failed: ${err.message}`);
    res.error(err.message, 400);
  }
}

async function getFriendRequests(req, res, next) {
  try {
    const type = req.query.type || 'incoming';
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const result = await friendService.getFriendRequests(req.user.userId, type, page, pageSize);
    res.paginate(result.data, result.total, page, pageSize);
  } catch (err) {
    logger.error(`Get friend requests failed: ${err.message}`);
    res.error('获取好友申请失败', 500);
  }
}

async function getUnreadRequestCount(req, res, next) {
  try {
    const count = await friendService.getUnreadRequestCount(req.user.userId);
    res.success({ count });
  } catch (err) {
    logger.error(`Get unread request count failed: ${err.message}`);
    res.error('获取未读数失败', 500);
  }
}

async function getFriends(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const result = await friendService.getFriends(req.user.userId, page, pageSize);
    res.paginate(result.data, result.total, page, pageSize);
  } catch (err) {
    logger.error(`Get friends failed: ${err.message}`);
    res.error('获取好友列表失败', 500);
  }
}

async function deleteFriend(req, res, next) {
  try {
    await friendService.deleteFriend(req.user.userId, parseInt(req.params.userId, 10));
    res.success(null, '已删除好友');
  } catch (err) {
    logger.error(`Delete friend failed: ${err.message}`);
    res.error(err.message, 400);
  }
}

async function getFriendStatus(req, res, next) {
  try {
    const status = await friendService.getFriendStatus(req.user.userId, parseInt(req.params.targetUserId, 10));
    res.success({ status });
  } catch (err) {
    logger.error(`Get friend status failed: ${err.message}`);
    res.error('获取好友状态失败', 500);
  }
}

async function blockUser(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) return res.error('缺少用户ID', 400);
    await friendService.blockUser(req.user.userId, userId);
    res.success(null, '已拉黑');
  } catch (err) {
    logger.error(`Block user failed: ${err.message}`);
    res.error(err.message, 400);
  }
}

async function unblockUser(req, res, next) {
  try {
    await friendService.unblockUser(req.user.userId, parseInt(req.params.userId, 10));
    res.success(null, '已取消拉黑');
  } catch (err) {
    logger.error(`Unblock user failed: ${err.message}`);
    res.error(err.message, 400);
  }
}

async function getBlockedUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const result = await friendService.getBlockedUsers(req.user.userId, page, pageSize);
    res.paginate(result.data, result.total, page, pageSize);
  } catch (err) {
    logger.error(`Get blocked users failed: ${err.message}`);
    res.error('获取黑名单失败', 500);
  }
}

async function checkFriendship(req, res, next) {
  try {
    const { userId1, userId2 } = req.query;
    const areFriends = await friendService.areFriends(parseInt(userId1, 10), parseInt(userId2, 10));
    const isBlocked = await friendService.isBlocked(parseInt(userId1, 10), parseInt(userId2, 10));
    res.success({ areFriends, isBlocked });
  } catch (err) {
    logger.error(`Check friendship failed: ${err.message}`);
    res.error('检查失败', 500);
  }
}

module.exports = {
  sendRequest, acceptRequest, rejectRequest, getFriendRequests,
  getUnreadRequestCount, getFriends, deleteFriend, getFriendStatus,
  blockUser, unblockUser, getBlockedUsers, checkFriendship
};
```

- [ ] **Step 2: Create routes/friends.js**

```javascript
const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authMiddleware, serviceAuthMiddleware } = require('xueqi-shared');

// Friend requests
router.post('/friends/requests', authMiddleware, friendController.sendRequest);
router.put('/friends/requests/:id/accept', authMiddleware, friendController.acceptRequest);
router.put('/friends/requests/:id/reject', authMiddleware, friendController.rejectRequest);
router.get('/friends/requests', authMiddleware, friendController.getFriendRequests);
router.get('/friends/requests/unread-count', authMiddleware, friendController.getUnreadRequestCount);

// Friends list
router.get('/friends', authMiddleware, friendController.getFriends);
router.delete('/friends/:userId', authMiddleware, friendController.deleteFriend);
router.get('/friends/status/:targetUserId', authMiddleware, friendController.getFriendStatus);

// Block
router.post('/friends/block', authMiddleware, friendController.blockUser);
router.delete('/friends/block/:userId', authMiddleware, friendController.unblockUser);
router.get('/friends/blocked', authMiddleware, friendController.getBlockedUsers);

// Internal (for study-service)
router.get('/friends/internal/check', serviceAuthMiddleware, friendController.checkFriendship);

module.exports = router;
```

- [ ] **Step 3: Register routes in app.js**

Add after `const uploadRoutes = ...` line:
```javascript
const friendRoutes = require('./routes/friends');
```

Add before `app.use('/api/user', profileRoutes);`:
```javascript
app.use('/api/user', friendRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add services/user-service/src/controllers/friendController.js services/user-service/src/routes/friends.js services/user-service/src/app.js
git commit -m "feat: add friend controller, routes, and app registration"
```

---

## Task 4: Frontend — API + Store

**Files:**
- Create: `frontend/src/api/friend.js`
- Create: `frontend/src/stores/friend.js`

- [ ] **Step 1: Create api/friend.js**

```javascript
import request from './request'

export const friendAPI = {
  sendRequest: (toUserId, message) =>
    request.post('/user/friends/requests', { toUserId, message }),
  acceptRequest: (requestId) =>
    request.put(`/user/friends/requests/${requestId}/accept`),
  rejectRequest: (requestId) =>
    request.put(`/user/friends/requests/${requestId}/reject`),
  getRequests: (params) =>
    request.get('/user/friends/requests', { params }),
  getUnreadRequestCount: () =>
    request.get('/user/friends/requests/unread-count'),
  getFriends: (params) =>
    request.get('/user/friends', { params }),
  deleteFriend: (userId) =>
    request.delete(`/user/friends/${userId}`),
  getStatus: (targetUserId) =>
    request.get(`/user/friends/status/${targetUserId}`),
  blockUser: (userId) =>
    request.post('/user/friends/block', { userId }),
  unblockUser: (userId) =>
    request.delete(`/user/friends/block/${userId}`),
  getBlockedUsers: (params) =>
    request.get('/user/friends/blocked', { params })
}
```

- [ ] **Step 2: Create stores/friend.js**

```javascript
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { friendAPI } from '@/api/friend'
import { messageStore as useMessageStore } from './message'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref([])
  const incomingRequests = ref([])
  const outgoingRequests = ref([])
  const unreadRequestCount = ref(0)
  const loading = ref(false)

  async function fetchFriends(page = 1) {
    loading.value = true
    try {
      const res = await friendAPI.getFriends({ page, pageSize: 50 })
      friends.value = res.data || []
    } catch (e) {
      console.warn('Fetch friends failed:', e.message)
    } finally {
      loading.value = false
    }
  }

  async function fetchIncomingRequests() {
    try {
      const res = await friendAPI.getRequests({ type: 'incoming' })
      incomingRequests.value = res.data || []
    } catch (e) {
      console.warn('Fetch incoming requests failed:', e.message)
    }
  }

  async function fetchOutgoingRequests() {
    try {
      const res = await friendAPI.getRequests({ type: 'outgoing' })
      outgoingRequests.value = res.data || []
    } catch (e) {
      console.warn('Fetch outgoing requests failed:', e.message)
    }
  }

  async function fetchUnreadRequestCount() {
    try {
      const res = await friendAPI.getUnreadRequestCount()
      unreadRequestCount.value = res.data?.count || 0
    } catch (e) {
      console.warn('Fetch unread request count failed:', e.message)
    }
  }

  async function sendRequest(toUserId, message) {
    const res = await friendAPI.sendRequest(toUserId, message)
    return res.data
  }

  async function acceptRequest(requestId) {
    const res = await friendAPI.acceptRequest(requestId)
    const data = res.data
    incomingRequests.value = incomingRequests.value.filter(r => r.id !== requestId)
    unreadRequestCount.value = Math.max(0, unreadRequestCount.value - 1)
    return data // { conversationId }
  }

  async function rejectRequest(requestId) {
    await friendAPI.rejectRequest(requestId)
    incomingRequests.value = incomingRequests.value.filter(r => r.id !== requestId)
    unreadRequestCount.value = Math.max(0, unreadRequestCount.value - 1)
  }

  async function deleteFriend(userId) {
    await friendAPI.deleteFriend(userId)
    friends.value = friends.value.filter(f => f.id !== userId)
  }

  async function blockUser(userId) {
    await friendAPI.blockUser(userId)
    friends.value = friends.value.filter(f => f.id !== userId)
  }

  async function unblockUser(userId) {
    await friendAPI.unblockUser(userId)
  }

  async function getFriendStatus(targetUserId) {
    const res = await friendAPI.getStatus(targetUserId)
    return res.data?.status || 'none'
  }

  function setupSocketListeners() {
    const { getSocket } = require('@/composables/useSocket')
    const socket = getSocket()

    socket.on('friend:request', (data) => {
      unreadRequestCount.value++
      incomingRequests.value.unshift(data)
    })

    socket.on('friend:accepted', () => {
      fetchFriends()
    })
  }

  function removeSocketListeners() {
    const { getSocket } = require('@/composables/useSocket')
    const socket = getSocket()
    socket.off('friend:request')
    socket.off('friend:accepted')
  }

  return {
    friends, incomingRequests, outgoingRequests, unreadRequestCount, loading,
    fetchFriends, fetchIncomingRequests, fetchOutgoingRequests,
    fetchUnreadRequestCount, sendRequest, acceptRequest, rejectRequest,
    deleteFriend, blockUser, unblockUser, getFriendStatus,
    setupSocketListeners, removeSocketListeners
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/friend.js frontend/src/stores/friend.js
git commit -m "feat: add friend API module and Pinia store"
```

---

## Task 5: Backend — study-service 好友校验

**Files:**
- Modify: `services/study-service/src/socket.js`
- Modify: `services/study-service/src/services/privateChatService.js`
- Modify: `services/study-service/src/controllers/privateChatController.js`

- [ ] **Step 1: Add friend/block check to socket.js pm:send handler**

In `services/study-service/src/socket.js`, add `redis` to the require destructuring on line 1:
```javascript
const { logger, jwt: { verifyToken }, db, redis } = require('xueqi-shared');
```

In the `pm:send` handler, after the rate limit check and before `getOrCreateConversation`, insert:

```javascript
      // Friend & block check via Redis
      try {
        const [isFriend, blockedByReceiver, blockedBySender] = await Promise.all([
          redis.sismember(`friends:${userId}`, data.toUserId),
          redis.sismember(`blocks:${data.toUserId}`, userId),
          redis.sismember(`blocks:${userId}`, data.toUserId)
        ]);
        if (!isFriend) {
          socket.emit('pm:error', { message: '只能给好友发消息' });
          return;
        }
        if (blockedByReceiver || blockedBySender) {
          socket.emit('pm:error', { message: '无法发送消息' });
          return;
        }
      } catch (e) {
        logger.warn(`Friend check Redis failed: ${e.message}`);
      }
```

- [ ] **Step 2: Add Redis Pub/Sub subscriber in initSocket**

At the end of `initSocket()` function, before `logger.info('Socket.IO server initialized')`, add:

```javascript
  // Subscribe to friend events from user-service
  const subscriber = redis.duplicate();
  subscriber.subscribe('xueqi:friend_events');
  subscriber.on('message', (channel, message) => {
    if (channel !== 'xueqi:friend_events' || !io) return;
    try {
      const event = JSON.parse(message);
      if (event.type === 'friend_request') {
        io.to(`user:${event.toUserId}`).emit('friend:request', {
          requestId: event.requestId,
          fromUserId: event.fromUserId,
          fromNickname: event.fromNickname,
          fromAvatar: event.fromAvatar
        });
      } else if (event.type === 'friend_accepted') {
        io.to(`user:${event.toUserId}`).emit('friend:accepted', {
          acceptedByUserId: event.acceptedByUserId,
          acceptedByNickname: event.acceptedByNickname,
          conversationId: event.conversationId
        });
      }
    } catch (e) {
      logger.warn(`Parse friend event failed: ${e.message}`);
    }
  });
```

- [ ] **Step 3: Add friend check to privateChatService getOrCreateConversation**

At the top of the `getOrCreateConversation` function, add:

```javascript
  // Check friendship via Redis
  try {
    const isFriend = await redis.sismember(`friends:${user1Id}`, user2Id);
    if (!isFriend) return null;
  } catch (e) {
    // Redis down — allow through (graceful degradation)
  }
```

- [ ] **Step 4: Add friend check to privateChatController createConversation**

In the `createConversation` function, after the `toUserId` validation:

```javascript
    if (!conv) {
      return res.error('只能与好友发起会话', 403);
    }
```

(The existing code does `const conv = await privateChatService.getOrCreateConversation(...)` — now it may return null.)

- [ ] **Step 5: Commit**

```bash
git add services/study-service/src/socket.js services/study-service/src/services/privateChatService.js services/study-service/src/controllers/privateChatController.js
git commit -m "feat: add friend/block check to private messaging"
```

---

## Task 6: Frontend — UserProfileCard Component

**Files:**
- Create: `frontend/src/components/UserProfileCard.vue`

- [ ] **Step 1: Create UserProfileCard.vue**

A popup card (Teleport to body) that shows user info and friend action buttons. Props: `userId` (Number), `visible` (Boolean). Emits: `close`, `open-chat`.

Template structure:
- Overlay backdrop (click to close)
- Card with: avatar (64px), nickname, bio, online status
- Action buttons based on friend status:
  - `none` → "添加好友" button (expands to show message input + confirm)
  - `request_sent` → disabled "已申请"
  - `request_received` → "接受" + "拒绝"
  - `friend` → "发消息" + dropdown (删除好友 / 拉黑)
  - `blocked` → "取消拉黑"
  - `blocked_by` → no action
- Accept triggers `@open-chat` with conversationId

Use `getFriendStatus` from friendStore, fetch user info via existing user API or `/study/private-chat/users/:id/status`.

Style: match existing `card` class with `glass-card` effect, Chinese theme colors.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/UserProfileCard.vue
git commit -m "feat: add UserProfileCard popup component"
```

---

## Task 7: Frontend — MessagesPage Three-Tab Redesign

**Files:**
- Modify: `frontend/src/views/MessagesPage.vue`

- [ ] **Step 1: Redesign MessagesPage with three tabs**

Replace the current single-list layout with:

```
Header: "消息" + unread badge
Tab bar: [消息] [好友] [申请(n)]
  ↓ tab content ↓
Tab "消息": existing conversations list (unchanged)
Tab "好友": friend cards grid + search input, click → open profile card or chat
Tab "申请": sub-tabs "收到"/"发出", accept/reject buttons
```

Key implementation details:
- Use `ref('messages')` for active tab state
- Fetch friends + requests on mount (parallel with existing conversations fetch)
- Friend card: avatar, nickname, bio snippet, click opens chat or profile card
- Request card: sender avatar, nickname, optional message, timestamp, accept/reject buttons
- Accept → `friendStore.acceptRequest(id)` → get `conversationId` → `router.push('/messages/' + conversationId)`
- Import and use `useFriendStore`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/MessagesPage.vue
git commit -m "feat: redesign MessagesPage with friend/request tabs"
```

---

## Task 8: Frontend — ChatPage + UserAvatar + AppNavbar

**Files:**
- Modify: `frontend/src/views/ChatPage.vue`
- Modify: `frontend/src/components/UserAvatar.vue`
- Modify: `frontend/src/components/AppNavbar.vue`

- [ ] **Step 1: Add friend management to ChatPage**

- Add a "more" button (⋮) in chat-header next to peer name
- Dropdown: "查看资料" (opens UserProfileCard), "删除好友" (confirm dialog), "拉黑" (confirm dialog)
- Add `pm:error` socket listener — show warning message from server
- Import `useFriendStore`

- [ ] **Step 2: Enhance UserAvatar with clickable prop**

Add props: `clickable: { type: Boolean, default: false }`, `userId: { type: Number, default: null }`.

When `clickable` is true:
- Add `@click="$emit('user-click', userId)"` to root elements
- Add `cursor: pointer` style
- Add `@click="$emit('user-click', userId)"` to both `<img>` and the placeholder div

- [ ] **Step 3: Update AppNavbar badge**

- Import `useFriendStore`
- Change `msgUnreadCount` computed to: `computed(() => messageStore.unreadTotal + friendStore.unreadRequestCount)`
- In `onMounted`, add: `friendStore.fetchUnreadRequestCount()`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ChatPage.vue frontend/src/components/UserAvatar.vue frontend/src/components/AppNavbar.vue
git commit -m "feat: add friend management to ChatPage, clickable UserAvatar, navbar badge"
```

---

## Task 9: Frontend — Cross-page Integration

**Files:**
- Modify: `frontend/src/views/StudyRoomsPage.vue`
- Modify: `frontend/src/views/CommunityPage.vue`
- Modify: `frontend/src/views/LeaderboardPage.vue`

- [ ] **Step 1: Add UserProfileCard to StudyRoomsPage**

- Import `UserProfileCard`, `useFriendStore`
- Add `clickable` and `userId` props to participant `<UserAvatar>` (around line 71): `<UserAvatar ... :clickable="true" :user-id="p.user_id" @user-click="openProfileCard"`
- Add `profileUserId` ref and `openProfileCard` handler
- Add `<UserProfileCard :user-id="profileUserId" :visible="!!profileUserId" @close="profileUserId = null" @open-chat="handleOpenChat" />`
- Replace existing PM button behavior: clicking PM now requires friend check (handled by existing `startPrivateChat` which calls `openConversation` → backend validates)

- [ ] **Step 2: Add UserProfileCard to CommunityPage**

- Add `clickable` and `userId` to post author `<UserAvatar>` (line 49): `<UserAvatar ... :clickable="true" :user-id="post.author_id" @user-click="openProfileCard"`
- Add `UserProfileCard` instance and handlers

- [ ] **Step 3: Add UserProfileCard to LeaderboardPage**

- Add `clickable` and `userId` to podium avatars (lines 26, 33, 39) and rank list avatar (line 50)
- Add `UserProfileCard` instance and handlers

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/StudyRoomsPage.vue frontend/src/views/CommunityPage.vue frontend/src/views/LeaderboardPage.vue
git commit -m "feat: integrate UserProfileCard across study rooms, community, leaderboard"
```

---

## Task 10: Verification & 开发计划.md Update

**Files:**
- Modify: `开发计划.md`

- [ ] **Step 1: Manual verification**

1. Rebuild containers: `docker compose up -d --build`
2. Verify `06-friend-system.sql` executed: check `friend_requests`, `friendships`, `blocks` tables exist
3. User A sends friend request to User B → B receives notification
4. B accepts → auto-redirect to chat, both can send messages
5. User A tries to message non-friend C → error "只能给好友发消息"
6. User A blocks C → C cannot send request or message
7. Click avatar on study rooms / community / leaderboard → profile card popup
8. Delete friend → chat history preserved but new messages blocked
9. Check navbar badge includes friend request count

- [ ] **Step 2: Update 开发计划.md**

Add friend system section to the development plan, covering:
- New database tables (friend_requests, friendships, blocks)
- New API endpoints under user-service
- Friendship-gated private messaging
- User profile card component
- Messages page three-tab layout
- Redis caching for cross-service friend checks

- [ ] **Step 3: Final commit**

```bash
git add 开发计划.md
git commit -m "docs: update development plan with friend system design"
```
