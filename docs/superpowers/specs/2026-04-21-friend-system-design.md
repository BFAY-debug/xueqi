# 好友系统实现计划

## Context

用户希望在「学栖」平台添加类似微信的好友系统：只有互为好友才能私聊，支持好友申请/接受/拒绝、用户资料卡弹窗、黑名单、删除好友。当前私聊系统已完整（会话表、消息表、Socket.IO 实时通信），但**没有任何权限校验**——任何人都能给任何人发消息。本计划在此基础上增加好友关系层，并以此门控私聊权限。

**核心决策：**
- 仅好友可私聊（微信模式）
- 单向申请 + 同意
- UI 采用消息页三栏 Tab（消息/好友/申请）
- 好友服务放在 user-service，通过 Redis SET 缓存好友关系供 study-service 校验
- 实时通知通过 Redis Pub/Sub 跨服务传递

---

## 阶段 1：数据库

**新建 `database/init/06-friend-system.sql`**（三张表）

### `friend_requests` — 好友申请
| 列 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| sender_id | INT NOT NULL | 申请人 |
| receiver_id | INT NOT NULL | 被申请人 |
| message | VARCHAR(200) | 附言（可选） |
| status | ENUM('pending','accepted','rejected') | 状态 |
| created_at, updated_at | TIMESTAMP | |

- `UNIQUE KEY uk_pair (sender_id, receiver_id)` — 防重复
- `INDEX idx_receiver_status (receiver_id, status, created_at DESC)` — 查收到的申请

### `friendships` — 好友关系
| 列 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| user1_id | INT NOT NULL | 较小 ID（与 conversations 表一致） |
| user2_id | INT NOT NULL | 较大 ID |
| created_at | TIMESTAMP | |

- `UNIQUE KEY uk_users (user1_id, user2_id)`

### `blocks` — 黑名单
| 列 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| blocker_id | INT NOT NULL | 拉黑者 |
| blocked_id | INT NOT NULL | 被拉黑者 |
| created_at | TIMESTAMP | |

---

## 阶段 2：后端 — user-service 好友模块

### 2.1 `services/user-service/src/services/friendService.js`（新建）

核心函数：
- **sendRequest(senderId, receiverId, message)** — 校验（非自己、对方存在、未被拉黑、非好友/无待处理申请），插入 friend_requests，创建通知（type='friend_request'），发布 Redis 事件
- **acceptRequest(requestId, userId)** — 校验 pending 且自己是 receiver，更新 status='accepted'，插入 friendships，同时在 Redis 中 `SADD friends:{user1Id} user2Id` 和 `SADD friends:{user2Id} user1Id`，创建 conversations 行（同库直接 SQL），返回 { friendshipId, conversationId }
- **rejectRequest(requestId, userId)** — 更新 status='rejected'
- **deleteFriend(userId, friendId)** — 删除 friendships 行，`SREM` Redis SET，保留聊天记录
- **blockUser(blockerId, blockedId)** — 插入 blocks，`SADD blocks:{blockerId} blockedId`，自动解除好友关系
- **unblockUser(blockerId, blockedId)** — 删除 blocks，`SREM`
- **getFriends(userId, page, pageSize)** — 查询好友列表（含昵称/头像/签名）
- **getFriendRequests(userId, type)** — type='incoming'|'outgoing'
- **getFriendStatus(myUserId, targetUserId)** — 返回 'friend'|'request_sent'|'request_received'|'blocked'|'blocked_by'|'none'
- **getUnreadRequestCount(userId)** — 未读申请数（用于 badge）
- **areFriends(userId1, userId2)** — 供内部服务调用
- **isBlockedBy(userId, targetUserId)** — 供内部服务调用

Redis 缓存策略：
- `friends:{userId}` — SET，存储所有好友 ID
- `blocks:{userId}` — SET，存储所有被拉黑的 ID
- 每次 friendships/blocks 变更时同步更新 Redis SET

通知：复用 `notificationService.createNotification()`，新增 type='friend_request' 和 'friend_accepted'

### 2.2 `services/user-service/src/controllers/friendController.js`（新建）

标准 CRUD 控制器，每个函数从 req.user.userId 提取用户，调用 friendService，返回 res.success/error。

额外：`checkFriendship` — serviceAuthMiddleware 保护的内部端点，供 study-service 调用。

### 2.3 `services/user-service/src/routes/friends.js`（新建）

```
POST   /friends/requests              — 发送申请
PUT    /friends/requests/:id/accept    — 接受
PUT    /friends/requests/:id/reject    — 拒绝
GET    /friends/requests               — 获取申请列表
GET    /friends/requests/unread-count  — 未读数
GET    /friends                        — 好友列表
DELETE /friends/:userId                — 删除好友
GET    /friends/status/:targetUserId   — 查关系状态
POST   /friends/block                  — 拉黑
DELETE /friends/block/:userId          — 取消拉黑
GET    /friends/blocked                — 黑名单
GET    /friends/internal/check         — 内部：检查好友关系（serviceAuth）
```

### 2.4 注册路由

修改 `services/user-service/src/app.js`：添加 friendRoutes，在 `/:id` 通配路由之前注册。

---

## 阶段 3：后端 — study-service 好友校验

### 3.1 `services/study-service/src/socket.js`

在 `pm:send` 处理器中，速率限制之后、发送消息之前，增加好友/黑名单检查：

```javascript
const [isFriend, isBlockedByReceiver, isBlockedBySender] = await Promise.all([
  redis.sismember(`friends:${userId}`, data.toUserId),
  redis.sismember(`blocks:${data.toUserId}`, userId),
  redis.sismember(`blocks:${userId}`, data.toUserId)
]);
if (!isFriend) { socket.emit('pm:error', { message: '只能给好友发消息' }); return; }
if (isBlockedByReceiver || isBlockedBySender) { socket.emit('pm:error', { message: '无法发送消息' }); return; }
```

添加 Redis Pub/Sub 订阅（initSocket 内）：
- 订阅 `xueqi:friend_events` 频道
- 收到 `friend_request` 事件 → `io.to('user:${toUserId}').emit('friend:request', data)`
- 收到 `friend_accepted` 事件 → `io.to('user:${toUserId}').emit('friend:accepted', data)`

### 3.2 `services/study-service/src/services/privateChatService.js`

在 `getOrCreateConversation` 中增加 Redis SISMEMBER 好友校验，非好友返回 null。

### 3.3 `services/study-service/src/controllers/privateChatController.js`

在 `createConversation` 中：非好友返回 403。

---

## 阶段 4：前端 API 层

**新建 `frontend/src/api/friend.js`**

按现有 `message.js` 模式，封装所有好友相关 API 调用（sendRequest, acceptRequest, rejectRequest, getFriends, getStatus, block, unblock 等）。baseURL 已为 `/api`，路径 `/user/friends/...`。

---

## 阶段 5：前端 Store

**新建 `frontend/src/stores/friend.js`**（Pinia defineStore）

状态：friends, incomingRequests, outgoingRequests, unreadRequestCount, blockedUsers, loading

Actions：fetchFriends, fetchIncomingRequests, sendRequest, acceptRequest（返回 conversationId 供自动跳转）, rejectRequest, deleteFriend, blockUser, unblockUser, fetchUnreadRequestCount, getFriendStatus

Socket 监听：
- `friend:request` → unreadRequestCount++，预添加到 incomingRequests
- `friend:accepted` → 自动跳转到聊天页面

---

## 阶段 6：前端 UI

### 6.1 UserProfileCard 组件（新建 `frontend/src/components/UserProfileCard.vue`）

弹窗组件（Teleport to body）：
- 显示：头像(64px)、昵称、签名、等级、学习统计
- 根据好友状态显示不同操作按钮：
  - `none` → "添加好友"（带可选附言）
  - `request_sent` → "已发送申请"（灰色）
  - `request_received` → "接受" + "拒绝"
  - `friend` → "发消息" + 溢出菜单（删除好友/拉黑）
  - `blocked` → "取消拉黑"
- 接受后自动打开聊天

### 6.2 MessagesPage 改造（`frontend/src/views/MessagesPage.vue`）

三个 Tab：
- **消息** — 现有会话列表（不变）
- **好友** — 好友卡片列表，支持搜索，点击打开资料卡或直接跳转聊天
- **申请** — 子 Tab：收到/发出，带接受/拒绝按钮和未读 badge

### 6.3 ChatPage 增强（`frontend/src/views/ChatPage.vue`）

- 头部添加"更多"按钮，下拉菜单：查看资料、删除好友、拉黑
- 监听 `pm:error` 事件，显示错误提示（如"只能给好友发消息"）

### 6.4 UserAvatar 增强（`frontend/src/components/UserAvatar.vue`）

- 新增 props: `clickable` (Boolean), `userId` (Number)
- clickable=true 时点击触发 `@user-click` 事件，cursor: pointer
- 各页面（StudyRoomsPage, CommunityPage, LeaderboardPage）通过此事件打开 UserProfileCard

### 6.5 AppNavbar（`frontend/src/components/AppNavbar.vue`）

- 消息 badge 合并计算：`messageStore.unreadTotal + friendStore.unreadRequestCount`
- onMounted 中添加 `friendStore.fetchUnreadRequestCount()`

---

## 实施顺序

1. 数据库迁移（06-friend-system.sql）
2. user-service：friendService → friendController → routes → app.js 注册
3. 前端：api/friend.js → stores/friend.js
4. study-service：socket.js 好友校验 + Redis Pub/Sub
5. 前端 UI：UserProfileCard → MessagesPage Tab → ChatPage → UserAvatar 增强 → AppNavbar
6. 跨页面集成：StudyRoomsPage、CommunityPage、LeaderboardPage 的头像点击

---

## 关键文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `database/init/06-friend-system.sql` |
| 新建 | `services/user-service/src/services/friendService.js` |
| 新建 | `services/user-service/src/controllers/friendController.js` |
| 新建 | `services/user-service/src/routes/friends.js` |
| 修改 | `services/user-service/src/app.js` |
| 修改 | `services/study-service/src/socket.js` |
| 修改 | `services/study-service/src/services/privateChatService.js` |
| 修改 | `services/study-service/src/controllers/privateChatController.js` |
| 新建 | `frontend/src/api/friend.js` |
| 新建 | `frontend/src/stores/friend.js` |
| 新建 | `frontend/src/components/UserProfileCard.vue` |
| 修改 | `frontend/src/views/MessagesPage.vue` |
| 修改 | `frontend/src/views/ChatPage.vue` |
| 修改 | `frontend/src/components/UserAvatar.vue` |
| 修改 | `frontend/src/components/AppNavbar.vue` |
| 修改 | `frontend/src/views/StudyRoomsPage.vue` |
| 修改 | `frontend/src/views/CommunityPage.vue` |
| 修改 | `frontend/src/views/LeaderboardPage.vue` |

## 验证

1. `docker compose up -d` 启动全部容器，确认 06-friend-system.sql 执行成功
2. 用户 A 向用户 B 发送好友申请 → B 收到通知
3. B 接受申请 → 自动跳转到聊天页面，双方可以发消息
4. 用户 A 尝试给非好友 C 发消息 → 收到"只能给好友发消息"错误
5. 用户 A 拉黑用户 B → B 无法给 A 发消息或申请
6. 在自习室/社区/排行榜页面点击用户头像 → 弹出资料卡，可加好友
7. 删除好友后 → 聊天记录保留但无法发新消息
