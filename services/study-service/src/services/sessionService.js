const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * Start a study session
 */
async function startSession(userId, { roomId, sessionType = 'free' }) {
  // Check if user has an active session
  const [active] = await db.execute(
    "SELECT id FROM study_sessions WHERE user_id = ? AND status = 'active'",
    [userId]
  );

  if (active.length > 0) {
    const error = new Error('你已有一个进行中的学习会话');
    error.status = 400;
    throw error;
  }

  const [result] = await db.execute(
    `INSERT INTO study_sessions (user_id, room_id, start_time, session_type, status)
     VALUES (?, ?, NOW(), ?, 'active')`,
    [userId, roomId || null, sessionType]
  );

  // Update checkin streak via user service
  try {
    const token = getServiceToken();
    await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
      userId,
      action: 'checkin'
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
  await db.execute(
    'UPDATE user_stats SET total_study_minutes = total_study_minutes + ? WHERE user_id = ?',
    [durationMinutes, userId]
  );

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
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
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
    roleName: 'super_admin'
  });
}

module.exports = { startSession, endSession, getMySessions };
