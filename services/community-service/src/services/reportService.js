const { db, logger } = require('xueqi-shared');

async function submitReport(reporterId, targetType, targetId, reason, description) {
  // Validate targetType
  if (!['post', 'comment'].includes(targetType)) {
    const error = new Error('无效的举报目标类型');
    error.status = 400;
    throw error;
  }

  // Verify target exists
  if (targetType === 'post') {
    const [rows] = await db.execute('SELECT id FROM posts WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      const error = new Error('帖子不存在');
      error.status = 404;
      throw error;
    }
  } else if (targetType === 'comment') {
    const [rows] = await db.execute('SELECT id FROM comments WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      const error = new Error('评论不存在');
      error.status = 404;
      throw error;
    }
  }

  // Check duplicate (only block if there's a pending report)
  const [existing] = await db.execute(
    "SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'",
    [reporterId, targetType, targetId]
  );
  if (existing.length > 0) {
    const error = new Error('你已经举报过该内容');
    error.status = 400;
    throw error;
  }

  const validReasons = ['spam', 'abuse', 'inappropriate', 'other'];
  if (!validReasons.includes(reason)) {
    const error = new Error('无效的举报原因');
    error.status = 400;
    throw error;
  }

  const [result] = await db.execute(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
     VALUES (?, ?, ?, ?, ?)`,
    [reporterId, targetType, targetId, reason, description || null]
  );

  return { reportId: result.insertId };
}

module.exports = { submitReport };
