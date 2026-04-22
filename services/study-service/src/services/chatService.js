const { db, logger } = require('xueqi-shared');

/**
 * Check if a user is a participant in a room
 */
async function isRoomParticipant(roomId, userId) {
  const [rows] = await db.execute(
    'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ?',
    [roomId, userId]
  );
  return rows.length > 0;
}

/**
 * Get recent messages for a room (with participant check)
 */
async function getRecentMessages(roomId, limit = 50, userId = null) {
  if (userId !== null && !(await isRoomParticipant(roomId, userId))) {
    const error = new Error('你不是该房间的参与者');
    error.status = 403;
    throw error;
  }
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
async function getRecentMessages(roomId, limit = 50) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
  const [rows] = await db.execute(
    `SELECT m.id, m.room_id, m.user_id, m.content, m.image_url, m.type, m.created_at,
            u.nickname, u.avatar_url, u.username
     FROM room_messages m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.room_id = ?
     ORDER BY m.created_at DESC
     LIMIT ${safeLimit}`,
    [roomId]
  );
  return rows.reverse().map(row => {
    if (row.type === 'anonymous') {
      return { ...row, user_id: null, nickname: '匿名学子', username: '匿名学子', avatar_url: null };
    }
    return row;
  });
}

/**
 * Create a user message
 */
async function createMessage(roomId, userId, content, type = 'user', imageUrl = null) {
  const [result] = await db.execute(
    `INSERT INTO room_messages (room_id, user_id, content, image_url, type) VALUES (?, ?, ?, ?, ?)`,
    [roomId, userId, content, imageUrl, type]
  );

  const [rows] = await db.execute(
    `SELECT m.id, m.room_id, m.user_id, m.content, m.image_url, m.type, m.created_at,
            u.nickname, u.avatar_url, u.username
     FROM room_messages m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.id = ?`,
    [result.insertId]
  );

  if (rows[0]) return rows[0];

  const [fallback] = await db.execute(
    'SELECT id, room_id, user_id, content, image_url, type, created_at FROM room_messages WHERE id = ?',
    [result.insertId]
  );
  return fallback[0] || null;
}

/**
 * Create a system message (join/leave notifications)
 */
async function createSystemMessage(roomId, content) {
  const [result] = await db.execute(
    `INSERT INTO room_messages (room_id, user_id, content, type) VALUES (?, NULL, ?, 'system')`,
    [roomId, content]
  );

  const [rows] = await db.execute(
    'SELECT id, room_id, user_id, content, image_url, type, created_at FROM room_messages WHERE id = ?',
    [result.insertId]
  );
  return rows[0] || null;
}

/**
 * Get rooms the user has chatted in, with last message info
 */
async function getUserChatRooms(userId) {
  const [rows] = await db.execute(
    `SELECT m.room_id, r.name AS room_name,
            (SELECT m2.content FROM room_messages m2 WHERE m2.room_id = m.room_id ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
            (SELECT m3.created_at FROM room_messages m3 WHERE m3.room_id = m.room_id ORDER BY m3.created_at DESC LIMIT 1) AS last_time
     FROM room_messages m
     LEFT JOIN study_rooms r ON r.id = m.room_id
     WHERE m.user_id = ? AND m.type IN ('user', 'anonymous')
     GROUP BY m.room_id, r.name
     ORDER BY last_time DESC`,
    [userId]
  );
  return rows;
}

/**
 * Mark all messages in a room as read for a user
 */
async function markMessagesRead(roomId, userId) {
  // Get all message IDs in this room that the user hasn't read yet
  const [messages] = await db.execute(
    `SELECT m.id FROM room_messages m
     LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = ?
     WHERE m.room_id = ? AND m.user_id IS NOT NULL AND m.user_id != ? AND mr.message_id IS NULL`,
    [userId, roomId, userId]
  );

  if (!messages.length) return 0;

  const values = messages.map(m => [m.id, userId]);
  const placeholders = values.map(() => '(?, ?)').join(', ');
  const flatValues = values.flat();

  await db.execute(
    `INSERT IGNORE INTO message_reads (message_id, user_id) VALUES ${placeholders}`,
    flatValues
  );

  return messages.length;
}

/**
 * Get read count for a specific message
 */
async function getMessageReadCount(messageId) {
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS cnt FROM message_reads WHERE message_id = ?',
    [messageId]
  );
  return rows[0]?.cnt || 0;
}

/**
 * Get read counts for multiple messages
 */
async function getMessageReadCounts(messageIds) {
  if (!messageIds.length) return {};
  const placeholders = messageIds.map(() => '?').join(', ');
  const [rows] = await db.execute(
    `SELECT message_id, COUNT(*) AS cnt FROM message_reads WHERE message_id IN (${placeholders}) GROUP BY message_id`,
    messageIds
  );
  const map = {};
  rows.forEach(r => { map[r.message_id] = r.cnt; });
  return map;
}

/**
 * Get all available chat rooms
 */
async function getAvailableRooms() {
  const [rows] = await db.execute(
    'SELECT id, name, description, capacity FROM study_rooms WHERE status = 1 ORDER BY id'
  );
  return rows;
}

module.exports = {
  getRecentMessages,
  createMessage,
  createSystemMessage,
  getUserChatRooms,
  markMessagesRead,
  getMessageReadCount,
  getMessageReadCounts,
  getAvailableRooms
};
