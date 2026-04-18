const { db, logger } = require('xueqi-shared');

/**
 * Create a notification
 */
async function createNotification({ userId, type, title, content, relatedId, relatedType }) {
  const [result] = await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, content, relatedId || null, relatedType || null]
  );
  return result.insertId;
}

/**
 * Get notifications list (paginated)
 */
async function getNotifications(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Get unread count
 */
async function getUnreadCount(userId) {
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return rows[0].count;
}

/**
 * Mark single notification as read
 */
async function markAsRead(userId, notificationId) {
  const [result] = await db.execute(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(userId) {
  const [result] = await db.execute(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return result.affectedRows;
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
