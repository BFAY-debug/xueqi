const { db, logger } = require('xueqi-shared');
const { broadcastParticipants } = require('../socket');

/**
 * List study rooms
 */
async function getRooms({ type = '', status = '' } = {}) {
  const conditions = [];
  const params = [];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (status !== '') {
    conditions.push('status = ?');
    params.push(parseInt(status, 10));
  } else {
    conditions.push('status = 1');
  }

  const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  const [rows] = await db.execute(
    `SELECT sr.*,
            (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = sr.id AND rp.is_studying = 1) AS current_count
     FROM study_rooms sr
     WHERE ${where}
     ORDER BY sr.created_at DESC`,
    params
  );

  return rows;
}

/**
 * Get room detail
 */
async function getRoomById(roomId) {
  const [rows] = await db.execute(
    `SELECT sr.*,
            (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = sr.id AND rp.is_studying = 1) AS current_count
     FROM study_rooms sr
     WHERE sr.id = ?`,
    [roomId]
  );

  if (rows.length === 0) {
    const error = new Error('自习室不存在');
    error.status = 404;
    throw error;
  }

  return rows[0];
}

/**
 * Create room (admin)
 */
async function createRoom({ name, description, capacity, type, coverImage, createdBy }) {
  const [result] = await db.execute(
    `INSERT INTO study_rooms (name, description, capacity, type, cover_image, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || null, capacity || 50, type || 'virtual', coverImage || null, createdBy]
  );

  return getRoomById(result.insertId);
}

/**
 * Update room (admin)
 */
async function updateRoom(roomId, { name, description, capacity, type, coverImage, status }) {
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (capacity !== undefined) { updates.push('capacity = ?'); params.push(capacity); }
  if (type !== undefined) { updates.push('type = ?'); params.push(type); }
  if (coverImage !== undefined) { updates.push('cover_image = ?'); params.push(coverImage); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }

  if (updates.length === 0) return getRoomById(roomId);

  params.push(roomId);
  await db.execute(`UPDATE study_rooms SET ${updates.join(', ')} WHERE id = ?`, params);

  return getRoomById(roomId);
}

/**
 * Join a room
 */
async function joinRoom(roomId, userId) {
  const room = await getRoomById(roomId);

  // Check capacity
  if (room.current_count >= room.capacity) {
    const error = new Error('自习室已满');
    error.status = 400;
    throw error;
  }

  // Check if already in room
  const [existing] = await db.execute(
    'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ?',
    [roomId, userId]
  );

  if (existing.length > 0) {
    // Rejoin
    await db.execute(
      'UPDATE room_participants SET is_studying = 1, joined_at = NOW() WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
  } else {
    await db.execute(
      'INSERT INTO room_participants (room_id, user_id, is_studying) VALUES (?, ?, 1)',
      [roomId, userId]
    );
  }

  // Broadcast updated participants
  const participants = await getParticipants(roomId);
  broadcastParticipants(roomId, { participants, action: 'join', userId });

  return getRoomById(roomId);
}

/**
 * Leave a room
 */
async function leaveRoom(roomId, userId) {
  await db.execute(
    'UPDATE room_participants SET is_studying = 0 WHERE room_id = ? AND user_id = ?',
    [roomId, userId]
  );

  // Broadcast updated participants
  const participants = await getParticipants(roomId);
  broadcastParticipants(roomId, { participants, action: 'leave', userId });

  return { roomId, userId, left: true };
}

/**
 * Get participants in a room
 */
async function getParticipants(roomId) {
  const [rows] = await db.execute(
    `SELECT rp.*, u.username, u.nickname, u.avatar_url
     FROM room_participants rp
     JOIN users u ON u.id = rp.user_id
     WHERE rp.room_id = ? AND rp.is_studying = 1
     ORDER BY rp.joined_at ASC`,
    [roomId]
  );

  return rows;
}

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  joinRoom,
  leaveRoom,
  getParticipants
};
