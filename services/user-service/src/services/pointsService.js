const { db, logger } = require('xueqi-shared');

// Points rules configuration
const POINTS_RULES = {
  study:         { points: 10, dailyLimit: 50,  description: '完成一次自习' },
  pomodoro:      { points: 5,  dailyLimit: 25,  description: '完成一次番茄钟' },
  seat_checkin:  { points: 15, dailyLimit: null, description: '预约座位并签到' },
  book_rate:     { points: 3,  dailyLimit: null, description: '为书籍评分' },
  book_review:   { points: 5,  dailyLimit: null, description: '写书评' },
  book_adopted:  { points: 20, dailyLimit: null, description: '推荐书籍被采纳' },
  post:          { points: 5,  dailyLimit: 20,  description: '发帖通过审核' },
  post_liked:    { points: 1,  dailyLimit: null, description: '帖子被点赞' },
  comment:       { points: 2,  dailyLimit: 10,  description: '评论通过审核' },
  checkin:       { points: 0,  dailyLimit: 30,  description: '连续签到奖励' },
  volunteer:     { points: 5,  dailyLimit: null, description: '完成志愿任务' }
};

/**
 * Reset daily points if needed (called before any points operation)
 */
async function ensureDailyReset(userId) {
  const [rows] = await db.execute(
    'SELECT daily_points, daily_reset_date FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  if (rows[0].daily_reset_date?.toISOString().slice(0, 10) !== today) {
    await db.execute(
      'UPDATE user_stats SET daily_points = 0, daily_reset_date = CURDATE() WHERE user_id = ?',
      [userId]
    );
  }
}

/**
 * Reset monthly penalty count if needed
 */
async function ensureMonthlyPenaltyReset(userId) {
  const [rows] = await db.execute(
    'SELECT penalty_reset_date FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) return;

  const now = new Date();
  const resetDate = rows[0].penalty_reset_date;
  const needsReset = !resetDate ||
    resetDate.getFullYear() !== now.getFullYear() ||
    resetDate.getMonth() !== now.getMonth();

  if (needsReset) {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    await db.execute(
      'UPDATE user_stats SET penalty_count = 0, penalty_reset_date = ? WHERE user_id = ?',
      [firstDay, userId]
    );
    logger.info(`Monthly penalty reset for user ${userId}`);
  }
}

/**
 * Award points to a user
 * @param {number} userId
 * @param {string} action - Key from POINTS_RULES
 * @param {object} options - Override points, check daily limit, etc.
 */
async function awardPoints(userId, action, options = {}) {
  const rule = POINTS_RULES[action];
  if (!rule) {
    logger.warn(`Unknown points action: ${action}`);
    return null;
  }

  const pointsToAward = options.points || rule.points;

  // Reset daily counter if needed
  await ensureDailyReset(userId);

  // Check daily limit
  if (rule.dailyLimit) {
    const [rows] = await db.execute(
      'SELECT daily_points FROM user_stats WHERE user_id = ?',
      [userId]
    );
    const currentDaily = rows[0]?.daily_points || 0;

    if (currentDaily + pointsToAward > rule.dailyLimit) {
      logger.info(`Daily limit reached for user ${userId}, action ${action}`);
      return { awarded: false, reason: 'daily_limit', dailyPoints: currentDaily, limit: rule.dailyLimit };
    }
  }

  // Special handling for checkin streak
  let actualPoints = pointsToAward;
  if (action === 'checkin' && options.streakDays) {
    actualPoints = Math.min(options.streakDays, 30);
  }

  // Log the points
  const description = options.description || rule.description;
  await db.execute(
    'INSERT INTO points_log (user_id, action, points, description) VALUES (?, ?, ?, ?)',
    [userId, action, actualPoints, description]
  );

  // Update user_stats
  await db.execute(
    `UPDATE user_stats
     SET total_points = total_points + ?,
         daily_points = daily_points + ?
     WHERE user_id = ?`,
    [actualPoints, actualPoints, userId]
  );

  // Check level up
  const levelChanged = await checkLevelUp(userId);

  logger.info(`Awarded ${actualPoints} points to user ${userId} for ${action}`);

  return {
    awarded: true,
    points: actualPoints,
    newLevel: levelChanged ? levelChanged.newLevel : null
  };
}

/**
 * Check if user should level up
 */
async function checkLevelUp(userId) {
  const [statsRows] = await db.execute(
    'SELECT total_points, level_id FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (statsRows.length === 0) return null;

  const { total_points, level_id } = statsRows[0];

  // Find the highest level the user qualifies for
  const [levels] = await db.execute(
    'SELECT id, name, min_points FROM levels WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1',
    [total_points]
  );

  if (levels.length > 0 && levels[0].id !== level_id) {
    await db.execute(
      'UPDATE user_stats SET level_id = ? WHERE user_id = ?',
      [levels[0].id, userId]
    );

    // Create level up notification
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'level_up', '恭喜升级！', ?)`,
      [userId, `恭喜你升级为${levels[0].name}(Lv.${levels[0].id})，继续加油！`]
    );

    logger.info(`User ${userId} leveled up to ${levels[0].name}`);
    return { newLevel: levels[0] };
  }

  return null;
}

/**
 * Get user points and level info
 */
async function getMyPoints(userId) {
  const [rows] = await db.execute(
    `SELECT us.total_points, us.daily_points, us.level_id,
            l.name AS level_name, l.badge AS level_badge, l.min_points,
            (SELECT l2.min_points FROM levels l2 WHERE l2.min_points > us.total_points ORDER BY l2.min_points ASC LIMIT 1) AS next_level_points,
            (SELECT l2.name FROM levels l2 WHERE l2.min_points > us.total_points ORDER BY l2.min_points ASC LIMIT 1) AS next_level_name
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

  return rows[0];
}

/**
 * Get points log (paginated)
 */
async function getPointsLog(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    'SELECT * FROM points_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM points_log WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Update checkin streak (called when user starts studying)
 */
async function updateCheckinStreak(userId) {
  const today = new Date().toISOString().slice(0, 10);

  const [rows] = await db.execute(
    'SELECT last_study_date, checkin_streak FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) return null;

  const { last_study_date, checkin_streak } = rows[0];
  const lastDate = last_study_date ? new Date(last_study_date).toISOString().slice(0, 10) : null;

  // Already studied today
  if (lastDate === today) {
    return { streak: checkin_streak, alreadyCheckedIn: true };
  }

  let newStreak = 1;
  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak = checkin_streak + 1;
    }
    // If diffDays > 1, streak resets to 1
  }

  await db.execute(
    'UPDATE user_stats SET checkin_streak = ?, last_study_date = CURDATE() WHERE user_id = ?',
    [newStreak, userId]
  );

  // Award checkin bonus points
  if (!lastDate || lastDate !== today) {
    await awardPoints(userId, 'checkin', {
      points: Math.min(newStreak, 30),
      streakDays: newStreak,
      description: `连续签到 ${newStreak} 天奖励`
    });
  }

  return { streak: newStreak, alreadyCheckedIn: false };
}

module.exports = {
  POINTS_RULES,
  awardPoints,
  getMyPoints,
  getPointsLog,
  updateCheckinStreak,
  ensureMonthlyPenaltyReset
};
