const { db, redis, logger } = require('xueqi-shared');
const notificationService = require('./notificationService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize two user IDs so the smaller one comes first.
 * Used for friendships and conversations tables.
 */
function normalizeIds(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Publish a friend-related event to the Redis pub/sub channel.
 */
async function publishFriendEvent(type, data) {
  try {
    await redis.publish(
      'xueqi:friend_events',
      JSON.stringify({ type, data })
    );
  } catch (e) {
    logger.warn(`Failed to publish friend event (${type}): ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. sendRequest
// ---------------------------------------------------------------------------

/**
 * Send a friend request.
 * - Validates: no self-request, receiver exists & active, no block in either
 *   direction, not already friends.
 * - If the other person already has a pending request to us, auto-accept it.
 * - Deletes old rejected requests so the user can re-send.
 */
async function sendRequest(senderId, receiverId, message = null) {
  // --- basic validation ---
  if (senderId === receiverId) {
    const err = new Error('不能向自己发送好友请求');
    err.status = 400;
    throw err;
  }

  // receiver must exist and be active
  const [receiverRows] = await db.execute(
    'SELECT id, username FROM users WHERE id = ? AND status = 1',
    [receiverId]
  );
  if (receiverRows.length === 0) {
    const err = new Error('目标用户不存在或已禁用');
    err.status = 404;
    throw err;
  }
  const receiverName = receiverRows[0].username;

  // check block in either direction
  const [blockRows] = await db.execute(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [senderId, receiverId, receiverId, senderId]
  );
  if (blockRows.length > 0) {
    const err = new Error('无法发送好友请求，存在屏蔽关系');
    err.status = 403;
    throw err;
  }

  // check already friends
  const [small, large] = normalizeIds(senderId, receiverId);
  const [friendRows] = await db.execute(
    'SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  if (friendRows.length > 0) {
    const err = new Error('已经是好友了');
    err.status = 409;
    throw err;
  }

  // --- check existing requests ---
  // If the OTHER person has a pending request TO us -> auto-accept
  const [reversePending] = await db.execute(
    "SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
    [receiverId, senderId]
  );
  if (reversePending.length > 0) {
    // Auto-accept the reverse request
    return acceptRequest(reversePending[0].id, senderId);
  }

  // Delete any old rejected request from sender -> receiver to allow re-send
  await db.execute(
    "DELETE FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'rejected'",
    [senderId, receiverId]
  );

  // Check for existing pending request (sender -> receiver)
  const [existingPending] = await db.execute(
    "SELECT id, status FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
    [senderId, receiverId]
  );
  if (existingPending.length > 0) {
    const err = new Error('已经发送过好友请求，请等待对方回应');
    err.status = 409;
    throw err;
  }

  // Insert new request
  const [result] = await db.execute(
    'INSERT INTO friend_requests (sender_id, receiver_id, message) VALUES (?, ?, ?)',
    [senderId, receiverId, message]
  );

  // Get sender nickname for notification
  const [senderRows] = await db.execute(
    'SELECT username FROM users WHERE id = ?',
    [senderId]
  );
  const senderName = senderRows[0]?.username || '用户';

  // Create notification for receiver
  await notificationService.createNotification({
    userId: receiverId,
    type: 'friend_request',
    title: '好友请求',
    content: `${senderName} 请求添加你为好友`,
    relatedId: result.insertId,
    relatedType: 'friend_request'
  });

  // Publish event
  await publishFriendEvent('friend_request', {
    requestId: result.insertId,
    senderId,
    receiverId,
    senderName,
    message
  });

  logger.info(`Friend request sent: ${senderId} -> ${receiverId}`);
  return { id: result.insertId, status: 'pending' };
}

// ---------------------------------------------------------------------------
// 2. acceptRequest
// ---------------------------------------------------------------------------

/**
 * Accept a friend request.
 * - Only the receiver can accept.
 * - Creates friendship row, updates Redis, creates/gets conversation.
 */
async function acceptRequest(requestId, userId) {
  // Fetch request
  const [reqRows] = await db.execute(
    'SELECT id, sender_id, receiver_id, status FROM friend_requests WHERE id = ?',
    [requestId]
  );
  if (reqRows.length === 0) {
    const err = new Error('好友请求不存在');
    err.status = 404;
    throw err;
  }
  const request = reqRows[0];

  if (request.status !== 'pending') {
    const err = new Error('该好友请求已被处理');
    err.status = 409;
    throw err;
  }

  if (request.receiver_id !== userId) {
    const err = new Error('无权操作此好友请求');
    err.status = 403;
    throw err;
  }

  // Update request status
  await db.execute(
    "UPDATE friend_requests SET status = 'accepted' WHERE id = ?",
    [requestId]
  );

  // Create friendship row
  const [small, large] = normalizeIds(request.sender_id, request.receiver_id);
  const [friendResult] = await db.execute(
    'INSERT INTO friendships (user1_id, user2_id) VALUES (?, ?)',
    [small, large]
  );

  // Update Redis friend sets for both users
  try {
    await redis.sadd(`friends:${request.sender_id}`, String(request.receiver_id));
    await redis.sadd(`friends:${request.receiver_id}`, String(request.sender_id));
  } catch (e) {
    logger.warn(`Redis friend SADD failed: ${e.message}`);
  }

  // Create or get conversation
  const [existingConv] = await db.execute(
    'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  let conversationId;
  if (existingConv.length > 0) {
    conversationId = existingConv[0].id;
  } else {
    const [convResult] = await db.execute(
      'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
      [small, large]
    );
    conversationId = convResult.insertId;
  }

  // Get receiver nickname for notification
  const [receiverRows] = await db.execute(
    'SELECT username FROM users WHERE id = ?',
    [userId]
  );
  const receiverName = receiverRows[0]?.username || '用户';

  // Notify sender that their request was accepted
  await notificationService.createNotification({
    userId: request.sender_id,
    type: 'friend_accepted',
    title: '好友请求已接受',
    content: `${receiverName} 接受了你的好友请求`,
    relatedId: friendResult.insertId,
    relatedType: 'friendship'
  });

  // Publish event
  await publishFriendEvent('friend_accepted', {
    requestId,
    friendshipId: friendResult.insertId,
    conversationId,
    senderId: request.sender_id,
    receiverId: request.receiver_id
  });

  logger.info(`Friend request accepted: ${request.sender_id} <-> ${request.receiver_id}`);
  return { friendshipId: friendResult.insertId, conversationId };
}

// ---------------------------------------------------------------------------
// 3. rejectRequest
// ---------------------------------------------------------------------------

/**
 * Reject a friend request.
 * - Only the receiver can reject.
 */
async function rejectRequest(requestId, userId) {
  const [reqRows] = await db.execute(
    'SELECT id, receiver_id, status FROM friend_requests WHERE id = ?',
    [requestId]
  );
  if (reqRows.length === 0) {
    const err = new Error('好友请求不存在');
    err.status = 404;
    throw err;
  }
  const request = reqRows[0];

  if (request.status !== 'pending') {
    const err = new Error('该好友请求已被处理');
    err.status = 409;
    throw err;
  }

  if (request.receiver_id !== userId) {
    const err = new Error('无权操作此好友请求');
    err.status = 403;
    throw err;
  }

  await db.execute(
    "UPDATE friend_requests SET status = 'rejected' WHERE id = ?",
    [requestId]
  );

  logger.info(`Friend request rejected: request ${requestId}`);
}

// ---------------------------------------------------------------------------
// 4. deleteFriend
// ---------------------------------------------------------------------------

/**
 * Delete a friendship.
 * - Removes DB row and Redis entries.
 * - Does NOT delete conversation or messages.
 */
async function deleteFriend(userId, friendId) {
  const [small, large] = normalizeIds(userId, friendId);

  const [result] = await db.execute(
    'DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );

  if (result.affectedRows === 0) {
    const err = new Error('好友关系不存在');
    err.status = 404;
    throw err;
  }

  // Remove from Redis
  try {
    await redis.srem(`friends:${userId}`, String(friendId));
    await redis.srem(`friends:${friendId}`, String(userId));
  } catch (e) {
    logger.warn(`Redis friend SREM failed: ${e.message}`);
  }

  // Delete any pending friend requests between them
  await db.execute(
    "DELETE FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'",
    [userId, friendId, friendId, userId]
  );

  logger.info(`Friendship deleted: ${userId} <-> ${friendId}`);
}

// ---------------------------------------------------------------------------
// 5. blockUser
// ---------------------------------------------------------------------------

/**
 * Block a user.
 * - Validates: not self.
 * - Auto-unfriends (deletes friendship + Redis).
 * - Rejects any pending requests between them.
 * - Inserts blocks row + Redis SADD.
 */
async function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) {
    const err = new Error('不能屏蔽自己');
    err.status = 400;
    throw err;
  }

  // Auto-unfriend if they are friends
  const [small, large] = normalizeIds(blockerId, blockedId);
  const [friendRows] = await db.execute(
    'SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  if (friendRows.length > 0) {
    await db.execute(
      'DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?',
      [small, large]
    );
    try {
      await redis.srem(`friends:${blockerId}`, String(blockedId));
      await redis.srem(`friends:${blockedId}`, String(blockerId));
    } catch (e) {
      logger.warn(`Redis friend SREM (during block) failed: ${e.message}`);
    }
  }

  // Reject any pending friend requests between them
  await db.execute(
    "UPDATE friend_requests SET status = 'rejected' WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'",
    [blockerId, blockedId, blockedId, blockerId]
  );

  // Insert block row (ignore if already blocked)
  await db.execute(
    'INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
    [blockerId, blockedId]
  );

  // Redis SADD
  try {
    await redis.sadd(`blocks:${blockerId}`, String(blockedId));
  } catch (e) {
    logger.warn(`Redis block SADD failed: ${e.message}`);
  }

  logger.info(`User ${blockerId} blocked user ${blockedId}`);
}

// ---------------------------------------------------------------------------
// 6. unblockUser
// ---------------------------------------------------------------------------

/**
 * Unblock a user.
 */
async function unblockUser(blockerId, blockedId) {
  const [result] = await db.execute(
    'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [blockerId, blockedId]
  );

  if (result.affectedRows === 0) {
    const err = new Error('未屏蔽该用户');
    err.status = 404;
    throw err;
  }

  try {
    await redis.srem(`blocks:${blockerId}`, String(blockedId));
  } catch (e) {
    logger.warn(`Redis block SREM failed: ${e.message}`);
  }

  logger.info(`User ${blockerId} unblocked user ${blockedId}`);
}

// ---------------------------------------------------------------------------
// 7. getFriends
// ---------------------------------------------------------------------------

/**
 * Get paginated friend list for a user.
 * Returns { data, total }.
 */
async function getFriends(userId, page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, Math.min(parseInt(pageSize, 10) || 20, 100));
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.avatar_url, u.bio, u.status, f.created_at AS friend_since
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user1_id = ? THEN f.user2_id ELSE f.user1_id END
     WHERE (f.user1_id = ? OR f.user2_id = ?)
     ORDER BY u.username ASC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId, userId, userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM friendships WHERE user1_id = ? OR user2_id = ?',
    [userId, userId]
  );

  return { data: rows, total: countRows[0].total };
}

// ---------------------------------------------------------------------------
// 8. getFriendRequests
// ---------------------------------------------------------------------------

/**
 * Get friend requests.
 * @param {string} type - 'incoming' (received, pending) or 'outgoing' (sent, pending/rejected)
 */
async function getFriendRequests(userId, type = 'incoming', page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, Math.min(parseInt(pageSize, 10) || 20, 100));
  const offset = (page - 1) * pageSize;

  let dataQuery, countQuery, queryParams, countParams;

  if (type === 'incoming') {
    dataQuery = `SELECT fr.id, fr.sender_id, fr.message, fr.status, fr.created_at,
                        u.username AS sender_username, u.avatar_url AS sender_avatar
                 FROM friend_requests fr
                 JOIN users u ON u.id = fr.sender_id
                 WHERE fr.receiver_id = ? AND fr.status = 'pending'
                 ORDER BY fr.created_at DESC
                 LIMIT ${pageSize} OFFSET ${offset}`;
    countQuery = "SELECT COUNT(*) AS total FROM friend_requests WHERE receiver_id = ? AND status = 'pending'";
    queryParams = [userId];
    countParams = [userId];
  } else {
    // outgoing: pending + rejected
    dataQuery = `SELECT fr.id, fr.receiver_id, fr.message, fr.status, fr.created_at,
                        u.username AS receiver_username, u.avatar_url AS receiver_avatar
                 FROM friend_requests fr
                 JOIN users u ON u.id = fr.receiver_id
                 WHERE fr.sender_id = ? AND fr.status IN ('pending', 'rejected')
                 ORDER BY fr.created_at DESC
                 LIMIT ${pageSize} OFFSET ${offset}`;
    countQuery = "SELECT COUNT(*) AS total FROM friend_requests WHERE sender_id = ? AND status IN ('pending', 'rejected')";
    queryParams = [userId];
    countParams = [userId];
  }

  const [rows] = await db.execute(dataQuery, queryParams);
  const [countRows] = await db.execute(countQuery, countParams);

  return { data: rows, total: countRows[0].total };
}

// ---------------------------------------------------------------------------
// 9. getFriendStatus
// ---------------------------------------------------------------------------

/**
 * Get the relationship status between two users.
 * Returns one of: 'self', 'friend', 'blocked', 'blocked_by',
 *                  'request_sent', 'request_received', 'none'.
 */
async function getFriendStatus(myUserId, targetUserId) {
  if (myUserId === targetUserId) return 'self';

  // Check block (either direction)
  const [blockRows] = await db.execute(
    'SELECT blocker_id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [myUserId, targetUserId, targetUserId, myUserId]
  );
  if (blockRows.length > 0) {
    return blockRows[0].blocker_id === myUserId ? 'blocked' : 'blocked_by';
  }

  // Check friendship
  const [small, large] = normalizeIds(myUserId, targetUserId);
  const [friendRows] = await db.execute(
    'SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  if (friendRows.length > 0) return 'friend';

  // Check friend requests
  const [reqRows] = await db.execute(
    "SELECT sender_id FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'",
    [myUserId, targetUserId, targetUserId, myUserId]
  );
  if (reqRows.length > 0) {
    return reqRows[0].sender_id === myUserId ? 'request_sent' : 'request_received';
  }

  return 'none';
}

// ---------------------------------------------------------------------------
// 10. getUnreadRequestCount
// ---------------------------------------------------------------------------

/**
 * Count pending friend requests received by a user.
 */
async function getUnreadRequestCount(userId) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) AS count FROM friend_requests WHERE receiver_id = ? AND status = 'pending'",
    [userId]
  );
  return rows[0].count;
}

// ---------------------------------------------------------------------------
// 11. areFriends
// ---------------------------------------------------------------------------

/**
 * Quick check whether two users are friends (for internal service use).
 */
async function areFriends(userId1, userId2) {
  const [small, large] = normalizeIds(userId1, userId2);
  const [rows] = await db.execute(
    'SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// 12. isBlocked
// ---------------------------------------------------------------------------

/**
 * Check whether there is a block relationship in either direction.
 * Returns { blocked: boolean, blockerId: number|null, blockedId: number|null }
 */
async function isBlocked(userId, targetUserId) {
  const [rows] = await db.execute(
    'SELECT blocker_id, blocked_id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [userId, targetUserId, targetUserId, userId]
  );
  if (rows.length === 0) return { blocked: false, blockerId: null, blockedId: null };
  return { blocked: true, blockerId: rows[0].blocker_id, blockedId: rows[0].blocked_id };
}

// ---------------------------------------------------------------------------
// 13. getBlockedUsers
// ---------------------------------------------------------------------------

/**
 * Get paginated list of users blocked by a user.
 */
async function getBlockedUsers(userId, page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, Math.min(parseInt(pageSize, 10) || 20, 100));
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.avatar_url, b.created_at AS blocked_at
     FROM blocks b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM blocks WHERE blocker_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

// ---------------------------------------------------------------------------
// 14. searchUsers
// ---------------------------------------------------------------------------

/**
 * Search users by nickname or username.
 * Returns paginated results with friend status relative to the searcher.
 */
async function searchUsers(userId, query, page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, Math.min(parseInt(pageSize, 10) || 20, 20));
  const offset = (page - 1) * pageSize;

  const likeQuery = `%${query}%`;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.avatar_url, u.bio
     FROM users u
     WHERE u.id != ? AND u.status = 1
       AND (u.username LIKE ? OR u.account_id LIKE ?)
     ORDER BY u.username ASC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId, likeQuery, likeQuery]
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM users
     WHERE id != ? AND status = 1
       AND (username LIKE ? OR account_id LIKE ?)`,
    [userId, likeQuery, likeQuery]
  );

  // Attach friend status for each result
  if (rows.length > 0) {
    const targetIds = rows.map(r => r.id);
    const [smallMe] = targetIds.map(() => userId);

    // Batch check friendships
    const [friendRows] = await db.execute(
      `SELECT user1_id, user2_id FROM friendships WHERE
       (user1_id = ? AND user2_id IN (${targetIds.map(() => '?').join(',')}))
       OR (user2_id = ? AND user1_id IN (${targetIds.map(() => '?').join(',')}))`,
      [userId, ...targetIds, userId, ...targetIds]
    );
    const friendSet = new Set();
    for (const fr of friendRows) {
      friendSet.add(fr.user1_id === userId ? fr.user2_id : fr.user1_id);
    }

    // Batch check pending requests
    const [reqRows] = await db.execute(
      `SELECT sender_id, receiver_id FROM friend_requests WHERE
       ((sender_id = ? AND receiver_id IN (${targetIds.map(() => '?').join(',')}))
       OR (receiver_id = ? AND sender_id IN (${targetIds.map(() => '?').join(',')})))
       AND status = 'pending'`,
      [userId, ...targetIds, userId, ...targetIds]
    );
    const sentSet = new Set();
    const receivedSet = new Set();
    for (const rq of reqRows) {
      if (rq.sender_id === userId) sentSet.add(rq.receiver_id);
      else receivedSet.add(rq.sender_id);
    }

    for (const row of rows) {
      if (friendSet.has(row.id)) row.friendStatus = 'friend';
      else if (sentSet.has(row.id)) row.friendStatus = 'request_sent';
      else if (receivedSet.has(row.id)) row.friendStatus = 'request_received';
      else row.friendStatus = 'none';
    }
  }

  return { data: rows, total: countRows[0].total };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  deleteFriend,
  blockUser,
  unblockUser,
  getFriends,
  getFriendRequests,
  getFriendStatus,
  getUnreadRequestCount,
  areFriends,
  isBlocked,
  getBlockedUsers,
  searchUsers
};
