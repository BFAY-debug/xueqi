const { db } = require('xueqi-shared');

const VALID_TYPES = ['功能建议', 'Bug 反馈', '体验优化', '其他'];

async function submitFeedback(userId, type, content) {
  if (!VALID_TYPES.includes(type)) type = '其他';
  if (!content || !content.trim()) {
    const err = new Error('反馈内容不能为空');
    err.status = 400;
    throw err;
  }
  if (content.length > 2000) {
    const err = new Error('反馈内容不能超过 2000 字');
    err.status = 400;
    throw err;
  }
  const [result] = await db.execute(
    'INSERT INTO feedback (user_id, type, content) VALUES (?, ?, ?)',
    [userId, type, content.trim()]
  );
  return { id: result.insertId };
}

async function getFeedbackList(page = 1, pageSize = 20, status = null) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, Math.min(parseInt(pageSize, 10) || 20, 100));
  const offset = (page - 1) * pageSize;

  let where = '';
  const params = [];
  if (status && ['pending', 'resolved', 'ignored'].includes(status)) {
    where = 'WHERE f.status = ?';
    params.push(status);
  }

  const [rows] = await db.execute(
    `SELECT f.id, f.type, f.content, f.status, f.admin_reply, f.created_at,
            u.id AS user_id, u.username, u.account_id, u.avatar_url, u.email
     FROM feedback f
     JOIN users u ON u.id = f.user_id
     ${where}
     ORDER BY f.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM feedback f ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

async function updateFeedbackStatus(id, status, adminReply = null) {
  const updates = ['status = ?'];
  const params = [status];
  if (adminReply !== undefined && adminReply !== null) {
    updates.push('admin_reply = ?');
    params.push(adminReply);
  }
  params.push(id);

  const [result] = await db.execute(
    `UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
  if (result.affectedRows === 0) {
    const err = new Error('反馈不存在');
    err.status = 404;
    throw err;
  }
  return { updated: true };
}

module.exports = { submitFeedback, getFeedbackList, updateFeedbackStatus };
