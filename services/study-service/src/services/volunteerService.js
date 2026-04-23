const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * List active volunteer tasks
 */
async function getTasks() {
  const [rows] = await db.execute(
    'SELECT * FROM volunteer_tasks WHERE status = 1 ORDER BY created_at DESC'
  );
  return rows;
}

/**
 * Apply for a volunteer task
 */
async function applyTask(userId, taskId) {
  // Check task exists and is active
  const [tasks] = await db.execute(
    'SELECT * FROM volunteer_tasks WHERE id = ? AND status = 1',
    [taskId]
  );
  if (tasks.length === 0) {
    const error = new Error('志愿任务不存在或已停用');
    error.status = 404;
    throw error;
  }

  // Check if already applied and pending
  const [existing] = await db.execute(
    "SELECT id FROM volunteer_records WHERE user_id = ? AND task_id = ? AND status = 'pending'",
    [userId, taskId]
  );
  if (existing.length > 0) {
    const error = new Error('已申请该任务，请等待管理员确认');
    error.status = 400;
    throw error;
  }

  const [result] = await db.execute(
    'INSERT INTO volunteer_records (user_id, task_id, status) VALUES (?, ?, ?)',
    [userId, taskId, 'pending']
  );

  return { recordId: result.insertId, taskId, status: 'pending' };
}

/**
 * Get pending volunteer records (admin)
 */
async function getPendingRecords(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT vr.*, u.username, u.username, vt.name AS task_name, vt.reward_penalty, vt.reward_points
     FROM volunteer_records vr
     JOIN users u ON u.id = vr.user_id
     JOIN volunteer_tasks vt ON vt.id = vr.task_id
     WHERE vr.status = 'pending'
     ORDER BY vr.created_at ASC
     LIMIT ${pageSize} OFFSET ${offset}`
  );

  const [countRows] = await db.execute(
    "SELECT COUNT(*) AS total FROM volunteer_records WHERE status = 'pending'"
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Confirm a volunteer record (admin)
 */
async function confirmRecord(recordId, adminId) {
  const [rows] = await db.execute(
    "SELECT vr.*, vt.reward_penalty, vt.reward_points FROM volunteer_records vr JOIN volunteer_tasks vt ON vt.id = vr.task_id WHERE vr.id = ? AND vr.status = 'pending'",
    [recordId]
  );

  if (rows.length === 0) {
    const error = new Error('志愿记录不存在或已处理');
    error.status = 404;
    throw error;
  }

  const record = rows[0];

  await db.execute(
    "UPDATE volunteer_records SET status = 'confirmed', admin_id = ?, confirmed_at = NOW() WHERE id = ?",
    [adminId, recordId]
  );

  // Reduce penalty count
  const seatService = require('./seatService');
  await seatService.reducePenalty(record.user_id, record.reward_penalty);

  // Award bonus points
  try {
    const token = getServiceToken();
    await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
      userId: record.user_id,
      action: 'volunteer',
      points: record.reward_points,
      description: `完成志愿任务「${record.task_name || ''}」`
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    logger.warn(`Failed to award volunteer points: ${err.message}`);
  }

  // Notify user
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'system', '志愿任务已确认', ?, ?, 'volunteer')`,
    [record.user_id, `你申请的志愿任务已被管理员确认，扣减 ${record.reward_penalty} 次违约，奖励 ${record.reward_points} 积分。`, recordId]
  );

  return { recordId, status: 'confirmed' };
}

/**
 * Reject a volunteer record (admin)
 */
async function rejectRecord(recordId, adminId) {
  const [rows] = await db.execute(
    "SELECT * FROM volunteer_records WHERE id = ? AND status = 'pending'",
    [recordId]
  );

  if (rows.length === 0) {
    const error = new Error('志愿记录不存在或已处理');
    error.status = 404;
    throw error;
  }

  await db.execute(
    "UPDATE volunteer_records SET status = 'rejected', admin_id = ?, confirmed_at = NOW() WHERE id = ?",
    [adminId, recordId]
  );

  // Notify user
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'system', '志愿任务未通过', ?, ?, 'volunteer')`,
    [rows[0].user_id, '你申请的志愿任务未被确认，请重新申请或联系管理员。', recordId]
  );

  return { recordId, status: 'rejected' };
}

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({
    userId: 0, username: 'study-service', roleId: 1, roleName: 'super_admin', type: 'service'
  });
}

module.exports = {
  getTasks,
  applyTask,
  getPendingRecords,
  confirmRecord,
  rejectRecord
};
