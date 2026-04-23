const { db, redis, logger } = require('xueqi-shared');

const UNREAD_PREFIX = 'pm:unread:';

async function getOrCreateConversation(user1Id, user2Id) {
  // Check friendship via Redis (friendship required for messaging)
  try {
    const isFriend = await redis.sismember(`friends:${user1Id}`, user2Id);
    if (!isFriend) return null;
  } catch (e) {
    // Redis down — graceful degradation, allow through
  }

  const [small, large] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

  const [existing] = await db.execute(
    'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
    [small, large]
  );
  if (existing.length) return existing[0];

  const [result] = await db.execute(
    'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
    [small, large]
  );
  return { id: result.insertId };
}

async function sendMessage(conversationId, senderId, content, imageUrl = null) {
  const [result] = await db.execute(
    'INSERT INTO private_messages (conversation_id, sender_id, content, image_url) VALUES (?, ?, ?, ?)',
    [conversationId, senderId, content, imageUrl || null]
  );
  await db.execute(
    'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
    [conversationId]
  );
  return result.insertId;
}

async function getConversationMessages(conversationId, userId, limit = 50, beforeId = null) {
  // Verify user belongs to conversation
  const [conv] = await db.execute(
    'SELECT user1_id, user2_id FROM conversations WHERE id = ?',
    [conversationId]
  );
  if (!conv.length || (conv[0].user1_id !== userId && conv[0].user2_id !== userId)) {
    return [];
  }

  let query = `SELECT pm.id, pm.sender_id AS senderId, pm.content, pm.image_url AS imageUrl, pm.is_read, pm.created_at,
                      u.username AS senderName, u.avatar_url AS senderAvatar
               FROM private_messages pm
               JOIN users u ON u.id = pm.sender_id
               WHERE pm.conversation_id = ?`;
  const params = [conversationId];

  if (beforeId) {
    query += ' AND pm.id < ?';
    params.push(beforeId);
  }
  query += ' ORDER BY pm.created_at DESC LIMIT ?';
  params.push(String(limit));

  const [rows] = await db.execute(query, params);
  return rows.reverse();
}

async function getUserConversations(userId) {
  const [rows] = await db.execute(
    `SELECT c.id, c.user1_id, c.user2_id, c.last_message_at,
            u1.username AS user1_name, u1.avatar_url AS user1_avatar,
            u2.username AS user2_name, u2.avatar_url AS user2_avatar
     FROM conversations c
     JOIN users u1 ON u1.id = c.user1_id
     JOIN users u2 ON u2.id = c.user2_id
     WHERE c.user1_id = ? OR c.user2_id = ?
     ORDER BY c.last_message_at DESC`,
    [userId, userId]
  );

  if (!rows.length) return [];

  const convIds = rows.map(r => r.id);

  // Batch fetch last messages for all conversations
  const [lastMsgRows] = await db.execute(
    `SELECT pm.conversation_id, pm.content
     FROM private_messages pm
     INNER JOIN (
       SELECT conversation_id, MAX(id) AS max_id
       FROM private_messages
       WHERE conversation_id IN (${convIds.map(() => '?').join(',')})
       GROUP BY conversation_id
     ) last ON pm.id = last.max_id`,
    convIds
  );
  const lastMsgMap = {};
  for (const m of lastMsgRows) {
    lastMsgMap[m.conversation_id] = m.content;
  }

  // Sync Redis unread counts from MySQL for consistency
  await syncUnreadFromDB(userId, convIds);
  const unreadMap = await getUnreadCounts(userId, convIds);

  return rows.map(row => {
    const isUser1 = row.user1_id === userId;
    return {
      id: row.id,
      peerId: isUser1 ? row.user2_id : row.user1_id,
      peerName: isUser1 ? row.user2_name : row.user1_name,
      peerAvatar: isUser1 ? row.user2_avatar : row.user1_avatar,
      lastMessage: lastMsgMap[row.id] || null,
      lastMessageAt: row.last_message_at,
      unreadCount: unreadMap[row.id] || 0
    };
  });
}

async function syncUnreadFromDB(userId, convIds) {
  if (!convIds.length) return;
  try {
    const [rows] = await db.execute(
      `SELECT conversation_id, COUNT(*) AS cnt FROM private_messages
       WHERE conversation_id IN (${convIds.map(() => '?').join(',')})
         AND sender_id != ? AND is_read = 0
       GROUP BY conversation_id`,
      [...convIds, userId]
    );
    const redisData = {};
    for (const row of rows) {
      redisData[row.conversation_id] = row.cnt;
    }
    // Set all counts, including 0 for conversations with no unread
    for (const id of convIds) {
      redisData[id] = redisData[id] || 0;
    }
    await redis.hset(UNREAD_PREFIX + userId, redisData);
  } catch (e) {
    logger.warn(`Redis unread sync failed: ${e.message}`);
  }
}

async function markConversationRead(conversationId, userId) {
  const [result] = await db.execute(
    'UPDATE private_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
    [conversationId, userId]
  );
  // Clear Redis unread count
  try {
    await redis.hset(UNREAD_PREFIX + userId, conversationId, 0);
  } catch (e) {
    logger.warn(`Redis unread clear failed: ${e.message}`);
  }
  return result.affectedRows;
}

async function incrementUnread(receiverId, conversationId) {
  try {
    await redis.hincrby(UNREAD_PREFIX + receiverId, conversationId, 1);
  } catch (e) {
    logger.warn(`Redis unread incr failed: ${e.message}`);
  }
}

async function getUnreadCounts(userId, convIds) {
  if (!convIds.length) return {};
  try {
    const vals = await redis.hmget(UNREAD_PREFIX + userId, convIds.map(String));
    const map = {};
    convIds.forEach((id, i) => {
      map[id] = parseInt(vals[i], 10) || 0;
    });
    return map;
  } catch (e) {
    logger.warn(`Redis unread fetch failed: ${e.message}`);
    return {};
  }
}

async function getTotalUnreadCount(userId) {
  try {
    const vals = await redis.hvals(UNREAD_PREFIX + userId);
    return vals.reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  } catch (e) {
    logger.warn(`Redis total unread failed: ${e.message}`);
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total FROM private_messages pm
       JOIN conversations c ON c.id = pm.conversation_id
       WHERE (c.user1_id = ? OR c.user2_id = ?) AND pm.sender_id != ? AND pm.is_read = 0`,
      [userId, userId, userId]
    );
    return rows[0].total;
  }
}

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markConversationRead,
  incrementUnread,
  getTotalUnreadCount
};
