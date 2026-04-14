const { db, logger } = require('xueqi-shared');

/**
 * Get all users (paginated, with filters)
 */
async function getUsers({ page = 1, pageSize = 20, search = '', role = '', status = '' }) {
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(u.username LIKE ? OR u.email LIKE ? OR u.nickname LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) {
    conditions.push('r.name = ?');
    params.push(role);
  }
  if (status !== '') {
    conditions.push('u.status = ?');
    params.push(parseInt(status, 10));
  }

  const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.email, u.nickname, u.avatar_url, u.bio,
            u.role_id, u.status, u.created_at,
            r.name AS role_name,
            us.total_points, us.level_id, l.name AS level_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN user_stats us ON us.user_id = u.id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id = r.id WHERE ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Change user role (super_admin only)
 */
async function changeUserRole(userId, newRoleId) {
  const [users] = await db.execute('SELECT id, role_id FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    const error = new Error('用户不存在');
    error.status = 404;
    throw error;
  }

  // Validate role exists
  const [roles] = await db.execute('SELECT id, name FROM roles WHERE id = ?', [newRoleId]);
  if (roles.length === 0) {
    const error = new Error('角色不存在');
    error.status = 400;
    throw error;
  }

  await db.execute('UPDATE users SET role_id = ? WHERE id = ?', [newRoleId, userId]);

  logger.info(`User ${userId} role changed to ${roles[0].name}`);
  return { userId, newRole: roles[0].name };
}

/**
 * Toggle user status (mute/unmute)
 */
async function changeUserStatus(userId, status) {
  const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    const error = new Error('用户不存在');
    error.status = 404;
    throw error;
  }

  await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

  // Create notification
  const title = status === 0 ? '账号已被禁言' : '账号已解禁';
  const content = status === 0
    ? '你的账号因违规行为已被管理员禁言，请遵守社区规范。'
    : '你的账号已被管理员解除禁言，欢迎继续使用。';

  await db.execute(
    'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)',
    [userId, 'system', title, content]
  );

  logger.info(`User ${userId} status changed to ${status === 0 ? 'muted' : 'active'}`);
  return { userId, status };
}

/**
 * Get system stats (super_admin only)
 */
async function getSystemStats() {
  const [userCount] = await db.execute('SELECT COUNT(*) AS count FROM users');
  const [activeToday] = await db.execute(
    'SELECT COUNT(DISTINCT user_id) AS count FROM points_log WHERE DATE(created_at) = CURDATE()'
  );
  const [postCount] = await db.execute(
    "SELECT COUNT(*) AS count FROM posts WHERE status = 'published'"
  );
  const [pendingPosts] = await db.execute(
    "SELECT COUNT(*) AS count FROM posts WHERE status = 'pending'"
  );
  const [pendingBooks] = await db.execute(
    "SELECT COUNT(*) AS count FROM books WHERE status = 'pending'"
  );
  const [pendingComments] = await db.execute(
    "SELECT COUNT(*) AS count FROM comments WHERE status = 'pending'"
  );
  const [totalPoints] = await db.execute(
    'SELECT COALESCE(SUM(total_points), 0) AS sum FROM user_stats'
  );
  const [totalStudy] = await db.execute(
    'SELECT COALESCE(SUM(total_study_minutes), 0) AS sum FROM user_stats'
  );

  return {
    users: {
      total: userCount[0].count,
      activeToday: activeToday[0].count
    },
    content: {
      publishedPosts: postCount[0].count,
      pendingPosts: pendingPosts[0].count,
      pendingBooks: pendingBooks[0].count,
      pendingComments: pendingComments[0].count
    },
    platform: {
      totalPoints: totalPoints[0].sum,
      totalStudyMinutes: totalStudy[0].sum
    }
  };
}

/**
 * Apply for admin role
 */
async function applyForAdmin(userId, reason) {
  // Check if user is already admin or super_admin
  const [users] = await db.execute('SELECT role_id FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    const error = new Error('用户不存在');
    error.status = 404;
    throw error;
  }
  if (users[0].role_id <= 2) {
    const error = new Error('你已经是管理员');
    error.status = 400;
    throw error;
  }

  // Check for existing pending application
  const [existing] = await db.execute(
    "SELECT id FROM admin_applications WHERE user_id = ? AND status = 'pending'",
    [userId]
  );
  if (existing.length > 0) {
    const error = new Error('你已有一份待审核的申请');
    error.status = 400;
    throw error;
  }

  const [result] = await db.execute(
    'INSERT INTO admin_applications (user_id, reason) VALUES (?, ?)',
    [userId, reason]
  );

  logger.info(`User ${userId} applied for admin role`);
  return { applicationId: result.insertId };
}

/**
 * Get pending admin applications (super_admin only)
 */
async function getPendingApplications({ page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT a.id, a.reason, a.status, a.created_at, a.reviewed_at,
            u.id AS user_id, u.username, u.nickname, u.avatar_url,
            r.name AS reviewer_name
     FROM admin_applications a
     JOIN users u ON a.user_id = u.id
     LEFT JOIN users r ON a.reviewer_id = r.id
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );

  const [countRows] = await db.execute(
    "SELECT COUNT(*) AS total FROM admin_applications WHERE status = 'pending'"
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Review an admin application (super_admin only)
 */
async function reviewApplication(applicationId, action, reviewerId) {
  const [apps] = await db.execute(
    'SELECT id, user_id, status FROM admin_applications WHERE id = ?',
    [applicationId]
  );
  if (apps.length === 0) {
    const error = new Error('申请不存在');
    error.status = 404;
    throw error;
  }
  if (apps[0].status !== 'pending') {
    const error = new Error('该申请已被处理');
    error.status = 400;
    throw error;
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await db.execute(
    'UPDATE admin_applications SET status = ?, reviewer_id = ?, reviewed_at = NOW() WHERE id = ?',
    [newStatus, reviewerId, applicationId]
  );

  // If approved, change user role to admin (role_id = 2)
  if (action === 'approve') {
    await db.execute('UPDATE users SET role_id = 2 WHERE id = ?', [apps[0].user_id]);
  }

  // Send notification to the applicant
  const title = action === 'approve' ? '管理员申请已通过' : '管理员申请被拒绝';
  const content = action === 'approve'
    ? '恭喜！你的管理员申请已通过，现在可以访问管理后台了。'
    : '你的管理员申请未获批准，请继续为社区做出贡献后再尝试。';

  await db.execute(
    'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)',
    [apps[0].user_id, 'system', title, content]
  );

  logger.info(`Application ${applicationId} ${newStatus} by reviewer ${reviewerId}`);
  return { applicationId, status: newStatus };
}

module.exports = {
  getUsers,
  changeUserRole,
  changeUserStatus,
  getSystemStats,
  applyForAdmin,
  getPendingApplications,
  reviewApplication
};
