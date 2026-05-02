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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Lock room row and check capacity atomically
    const [roomRows] = await conn.execute(
      `SELECT sr.*,
              (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = sr.id AND rp.is_studying = 1) AS current_count
       FROM study_rooms sr WHERE sr.id = ? FOR UPDATE`,
      [roomId]
    );

    if (roomRows.length === 0) {
      const error = new Error('自习室不存在');
      error.status = 404;
      throw error;
    }

    const room = roomRows[0];

    if (room.current_count >= room.capacity) {
      const error = new Error('自习室已满');
      error.status = 400;
      throw error;
    }

    // Check if already in room
    const [existing] = await conn.execute(
      'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (existing.length > 0) {
      await conn.execute(
        'UPDATE room_participants SET is_studying = 1, joined_at = NOW() WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
      );
    } else {
      await conn.execute(
        'INSERT INTO room_participants (room_id, user_id, is_studying) VALUES (?, ?, 1)',
        [roomId, userId]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Broadcast updated participants (outside transaction)
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
    `SELECT rp.*, u.username, u.username, u.avatar_url
     FROM room_participants rp
     JOIN users u ON u.id = rp.user_id
     WHERE rp.room_id = ? AND rp.is_studying = 1
     ORDER BY rp.joined_at ASC`,
    [roomId]
  );

  return rows;
}

/**
 * Find or create a room by face-to-face code
 */
async function findOrCreateByCode(code, userId) {
  const roomName = `面对面 #${code}`;
  const [rows] = await db.execute(
    'SELECT sr.*, (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = sr.id AND rp.is_studying = 1) AS current_count FROM study_rooms sr WHERE sr.name = ? AND sr.status = 1',
    [roomName]
  );
  if (rows.length) return rows[0];
  const [result] = await db.execute(
    `INSERT INTO study_rooms (name, capacity, type, created_by) VALUES (?, 50, 'virtual', ?)`,
    [roomName, userId]
  );
  return getRoomById(result.insertId);
}

/**
 * Delete a face-to-face room (creator only)
 */
async function deleteRoom(roomId, userId) {
  const [rows] = await db.execute('SELECT * FROM study_rooms WHERE id = ? AND status = 1', [roomId]);
  if (!rows.length) {
    const error = new Error('房间不存在');
    error.status = 404;
    throw error;
  }
  const room = rows[0];
  if (!room.name.startsWith('面对面 #')) {
    const error = new Error('只能删除面对面房间');
    error.status = 403;
    throw error;
  }
  if (room.created_by !== userId) {
    const error = new Error('只有创建者可以删除');
    error.status = 403;
    throw error;
  }
  await db.execute('DELETE FROM room_participants WHERE room_id = ?', [roomId]);
  await db.execute('DELETE FROM room_messages WHERE room_id = ?', [roomId]);
  await db.execute('DELETE FROM study_rooms WHERE id = ?', [roomId]);
  return { roomId, deleted: true };
}

/**
 * Auto-cleanup face-to-face rooms empty for over 5 minutes
 */
async function cleanupStaleRooms() {
  const [rows] = await db.execute(
    `SELECT sr.id FROM study_rooms sr
     WHERE sr.name LIKE '面对面 #%'
     AND sr.status = 1
     AND sr.created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
     AND (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = sr.id AND rp.is_studying = 1) = 0`
  );
  if (!rows.length) return;
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  await db.execute(`DELETE FROM room_participants WHERE room_id IN (${placeholders})`, ids);
  await db.execute(`DELETE FROM room_messages WHERE room_id IN (${placeholders})`, ids);
  await db.execute(`DELETE FROM study_rooms WHERE id IN (${placeholders})`, ids);
  logger.info(`Cleaned up ${ids.length} stale face-to-face room(s): ${ids.join(',')}`);
}

function startStaleRoomCleaner() {
  const interval = setInterval(async () => {
    try {
      await cleanupStaleRooms();
    } catch (err) {
      logger.warn(`Stale room cleanup failed: ${err.message}`);
    }
  }, 60 * 1000);
  return interval;
}

/**
 * Auto-kick participants who haven't sent a message in 10 minutes
 */
async function cleanupIdleParticipants() {
  const [idle] = await db.execute(
    `SELECT rp.room_id, rp.user_id
     FROM room_participants rp
     WHERE rp.is_studying = 1
       AND rp.joined_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       AND NOT EXISTS (
         SELECT 1 FROM room_messages rm
         WHERE rm.room_id = rp.room_id
           AND rm.user_id = rp.user_id
           AND rm.type = 'user'
           AND rm.created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       )`
  );
  if (!idle.length) return;

  const affectedRooms = new Set();
  for (const { room_id, user_id } of idle) {
    await db.execute(
      'UPDATE room_participants SET is_studying = 0 WHERE room_id = ? AND user_id = ?',
      [room_id, user_id]
    );
    affectedRooms.add(room_id);
  }

  for (const roomId of affectedRooms) {
    const participants = await getParticipants(roomId);
    broadcastParticipants(roomId, { participants, action: 'idle-kick' });
  }

  logger.info(`Kicked ${idle.length} idle participant(s) from ${affectedRooms.size} room(s)`);
}

function startIdleParticipantCleaner() {
  const interval = setInterval(async () => {
    try {
      await cleanupIdleParticipants();
    } catch (err) {
      logger.warn(`Idle participant cleanup failed: ${err.message}`);
    }
  }, 60 * 1000);
  return interval;
}

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  joinRoom,
  leaveRoom,
  getParticipants,
  findOrCreateByCode,
  deleteRoom,
  startStaleRoomCleaner,
  startIdleParticipantCleaner
};
