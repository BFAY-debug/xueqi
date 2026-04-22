const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * Start a study session
 */
async function startSession(userId, { roomId, sessionType = 'free' }) {
  // Check if user has an active session — auto-close stale ones
  const [active] = await db.execute(
    "SELECT id FROM study_sessions WHERE user_id = ? AND status = 'active'",
    [userId]
  );

  if (active.length > 0) {
    await db.execute(
      "UPDATE study_sessions SET end_time = NOW(), status = 'abandoned' WHERE id = ?",
      [active[0].id]
    );
    logger.info(`Auto-closed stale session ${active[0].id} for user ${userId}`);
  }

  const [result] = await db.execute(
    `INSERT INTO study_sessions (user_id, room_id, start_time, session_type, status)
     VALUES (?, ?, NOW(), ?, 'active')`,
    [userId, roomId || null, sessionType]
  );

  // Update checkin streak via user service
  try {
    const token = getServiceToken();
    await axios.post(`${USER_SERVICE_URL}/api/user/points/checkin`, {
      userId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    logger.warn(`Failed to update checkin streak for user ${userId}: ${err.message}`);
  }

  return { sessionId: result.insertId, userId, roomId, sessionType };
}

/**
 * End a study session
 */
async function endSession(sessionId, userId) {
  const [rows] = await db.execute(
    "SELECT * FROM study_sessions WHERE id = ? AND user_id = ? AND status = 'active'",
    [sessionId, userId]
  );

  if (rows.length === 0) {
    const error = new Error('学习会话不存在或已结束');
    error.status = 404;
    throw error;
  }

  const session = rows[0];
  const now = new Date();
  const startTime = new Date(session.start_time);
  const durationMinutes = Math.floor((now - startTime) / 60000);

  await db.execute(
    `UPDATE study_sessions SET end_time = NOW(), duration_minutes = ?, status = 'completed' WHERE id = ?`,
    [durationMinutes, sessionId]
  );

  // Update user stats
  if (durationMinutes > 0) {
    await db.execute(
      'UPDATE user_stats SET total_study_minutes = total_study_minutes + ? WHERE user_id = ?',
      [durationMinutes, userId]
    );
  }

  // Award study points (≥25 min)
  if (durationMinutes >= 25) {
    const isPomodoro = session.session_type === 'pomodoro';
    try {
      const token = getServiceToken();
      if (isPomodoro) {
        await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
          userId,
          action: 'pomodoro',
          description: `完成番茄钟（${durationMinutes}分钟）`
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
        userId,
        action: 'study',
        description: `完成自习（${durationMinutes}分钟）`
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      logger.warn(`Failed to award study points for user ${userId}: ${err.message}`);
    }
  }

  return {
    sessionId,
    durationMinutes,
    completed: true
  };
}

/**
 * Get my study sessions
 */
async function getMySessions(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT ss.*, sr.name AS room_name
     FROM study_sessions ss
     LEFT JOIN study_rooms sr ON sr.id = ss.room_id
     WHERE ss.user_id = ?
     ORDER BY ss.start_time DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM study_sessions WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Generate a service-to-service JWT token
 */
function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({
    userId: 0,
    username: 'study-service',
    roleId: 1,
    roleName: 'super_admin',
    type: 'service'
  });
}

/**
 * Get active session for a user (for timer recovery)
 */
async function getActiveSession(userId) {
  const [rows] = await db.execute(
    `SELECT id, room_id, start_time, session_type FROM study_sessions
     WHERE user_id = ? AND status = 'active'
     ORDER BY start_time DESC LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Close a stale active session (called when session is too old to recover)
 */
async function abandonActiveSession(userId) {
  await db.execute(
    "UPDATE study_sessions SET end_time = NOW(), status = 'abandoned' WHERE user_id = ? AND status = 'active'",
    [userId]
  );
}

module.exports = { startSession, endSession, getMySessions, getActiveSession, abandonActiveSession };
