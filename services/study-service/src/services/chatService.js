const { db, logger } = require('xueqi-shared');

/**
 * Get recent messages for a room
 */
async function getRecentMessages(roomId, limit = 50) {
  const [rows] = await db.execute(
    `SELECT m.id, m.room_id, m.user_id, m.content, m.type, m.created_at,
            u.nickname, u.avatar_url, u.username
     FROM room_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.room_id = ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [roomId, limit]
  );
  return rows.reverse();
}

/**
 * Create a user message
 */
async function createMessage(roomId, userId, content, type = 'user') {
  const [result] = await db.execute(
    `INSERT INTO room_messages (room_id, user_id, content, type) VALUES (?, ?, ?, ?)`,
    [roomId, userId, content, type]
  );

  // Fetch with user info
  const [rows] = await db.execute(
    `SELECT m.id, m.room_id, m.user_id, m.content, m.type, m.created_at,
            u.nickname, u.avatar_url, u.username
     FROM room_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.id = ?`,
    [result.insertId]
  );

  return rows[0] || null;
}

/**
 * Create a system message (join/leave notifications)
 */
async function createSystemMessage(roomId, content) {
  return createMessage(roomId, 0, content, 'system');
}

module.exports = {
  getRecentMessages,
  createMessage,
  createSystemMessage
};
