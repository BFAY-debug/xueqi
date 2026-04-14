const { db, logger } = require('xueqi-shared');

/**
 * Get user profile (self)
 */
async function getMyProfile(userId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.email, u.nickname, u.avatar_url, u.bio,
            u.role_id, u.status, u.created_at,
            r.name AS role_name,
            us.total_study_minutes, us.total_pomodoros, us.total_points,
            us.level_id, us.checkin_streak, us.penalty_count, us.ban_until,
            l.name AS level_name, l.badge AS level_badge
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN user_stats us ON us.user_id = u.id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE u.id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    const error = new Error('用户不存在');
    error.status = 404;
    throw error;
  }

  const row = rows[0];
  return {
    id: row.id,
    userId: row.id,
    username: row.username,
    email: row.email,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    bio: row.bio,
    roleId: row.role_id,
    roleName: row.role_name,
    status: row.status,
    created_at: row.created_at,
    total_study_minutes: row.total_study_minutes,
    total_pomodoros: row.total_pomodoros,
    total_points: row.total_points,
    level_id: row.level_id,
    checkin_streak: row.checkin_streak,
    penalty_count: row.penalty_count,
    ban_until: row.ban_until,
    level_name: row.level_name,
    level_badge: row.level_badge
  };
}

/**
 * Get public profile of another user
 */
async function getPublicProfile(userId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.nickname, u.avatar_url, u.bio, u.created_at,
            r.name AS role_name,
            us.total_study_minutes, us.total_pomodoros, us.total_points,
            us.level_id, us.checkin_streak,
            l.name AS level_name, l.badge AS level_badge
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN user_stats us ON us.user_id = u.id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE u.id = ? AND u.status = 1`,
    [userId]
  );

  if (rows.length === 0) {
    const error = new Error('用户不存在');
    error.status = 404;
    throw error;
  }

  return rows[0];
}

/**
 * Update user profile
 */
async function updateProfile(userId, { nickname, bio, email }) {
  const updates = [];
  const params = [];

  if (nickname !== undefined) {
    updates.push('nickname = ?');
    params.push(nickname);
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    params.push(bio);
  }
  if (email !== undefined) {
    // Check email uniqueness
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    if (existing.length > 0) {
      const error = new Error('该邮箱已被使用');
      error.status = 409;
      throw error;
    }
    updates.push('email = ?');
    params.push(email);
  }

  if (updates.length === 0) {
    return getMyProfile(userId);
  }

  params.push(userId);
  await db.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getMyProfile(userId);
}

/**
 * Update user avatar
 */
async function updateAvatar(userId, avatarUrl) {
  await db.execute(
    'UPDATE users SET avatar_url = ? WHERE id = ?',
    [avatarUrl, userId]
  );
  return getMyProfile(userId);
}

/**
 * Get user stats
 */
async function getUserStats(userId) {
  const [rows] = await db.execute(
    `SELECT us.*, l.name AS level_name, l.badge AS level_badge, l.min_points
     FROM user_stats us
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE us.user_id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    const error = new Error('用户统计不存在');
    error.status = 404;
    throw error;
  }

  // Get next level info
  const [nextLevels] = await db.execute(
    'SELECT id, name, min_points FROM levels WHERE min_points > ? ORDER BY min_points ASC LIMIT 1',
    [rows[0].total_points]
  );

  const stats = rows[0];
  stats.next_level = nextLevels.length > 0 ? nextLevels[0] : null;

  return stats;
}

module.exports = {
  getMyProfile,
  getPublicProfile,
  updateProfile,
  updateAvatar,
  getUserStats
};
