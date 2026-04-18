const { db, redis } = require('xueqi-shared');
const { logger } = require('xueqi-shared');

const CACHE_TTL = 300; // 5 minutes

/**
 * Build leaderboard query with common JOIN
 */
function baseLeaderboardQuery(whereClause, orderBy, limit = 50, offset = 0) {
  return db.execute(
    `SELECT u.id, u.username, u.nickname, u.avatar_url,
            us.total_points, us.total_study_minutes, us.checkin_streak,
            l.name AS level_name, l.badge AS level_badge
     FROM user_stats us
     JOIN users u ON u.id = us.user_id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`
  );
}

/**
 * Total points leaderboard
 */
async function getPointsLeaderboard(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;

  const [rows] = await baseLeaderboardQuery(
    'u.status = 1',
    'us.total_points DESC, u.id ASC',
    pageSize,
    offset
  );

  const [countRows] = await db.execute('SELECT COUNT(*) AS total FROM user_stats');
  return { data: rows, total: countRows[0].total };
}

/**
 * Weekly points leaderboard
 */
async function getWeeklyLeaderboard(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.nickname, u.avatar_url,
            COALESCE(SUM(pl.points), 0) AS weekly_points,
            (SELECT l2.name FROM levels l2 JOIN user_stats us2 ON us2.level_id = l2.id WHERE us2.user_id = u.id) AS level_name,
            (SELECT l2.badge FROM levels l2 JOIN user_stats us2 ON us2.level_id = l2.id WHERE us2.user_id = u.id) AS level_badge
     FROM users u
     LEFT JOIN points_log pl ON pl.user_id = u.id
       AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
       AND pl.points > 0
     WHERE u.status = 1
     GROUP BY u.id
     ORDER BY weekly_points DESC, u.id ASC
     LIMIT ${pageSize} OFFSET ${offset}`
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM users WHERE status = 1'
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Monthly points leaderboard
 */
async function getMonthlyLeaderboard(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.nickname, u.avatar_url,
            COALESCE(SUM(pl.points), 0) AS monthly_points,
            (SELECT l2.name FROM levels l2 JOIN user_stats us2 ON us2.level_id = l2.id WHERE us2.user_id = u.id) AS level_name,
            (SELECT l2.badge FROM levels l2 JOIN user_stats us2 ON us2.level_id = l2.id WHERE us2.user_id = u.id) AS level_badge
     FROM users u
     LEFT JOIN points_log pl ON pl.user_id = u.id
       AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE()) - 1 DAY)
       AND pl.points > 0
     WHERE u.status = 1
     GROUP BY u.id
     ORDER BY monthly_points DESC, u.id ASC
     LIMIT ${pageSize} OFFSET ${offset}`
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM users WHERE status = 1'
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Study time leaderboard
 */
async function getStudyLeaderboard(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;

  const [rows] = await baseLeaderboardQuery(
    'u.status = 1 AND us.total_study_minutes > 0',
    'us.total_study_minutes DESC, u.id ASC',
    pageSize,
    offset
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM user_stats WHERE total_study_minutes > 0'
  );
  return { data: rows, total: countRows[0].total };
}

/**
 * Checkin streak leaderboard
 */
async function getStreakLeaderboard(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;

  const [rows] = await baseLeaderboardQuery(
    'u.status = 1 AND us.checkin_streak > 0',
    'us.checkin_streak DESC, u.id ASC',
    pageSize,
    offset
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM user_stats WHERE checkin_streak > 0'
  );
  return { data: rows, total: countRows[0].total };
}

/**
 * Get my rank across all leaderboard types
 */
async function getMyRank(userId) {
  // Total points rank
  const [pointsRank] = await db.execute(
    `SELECT COUNT(*) + 1 AS \`rank\` FROM user_stats WHERE total_points >
     (SELECT total_points FROM user_stats WHERE user_id = ?)`,
    [userId]
  );

  // Study time rank
  const [studyRank] = await db.execute(
    `SELECT COUNT(*) + 1 AS \`rank\` FROM user_stats WHERE total_study_minutes >
     (SELECT total_study_minutes FROM user_stats WHERE user_id = ?)`,
    [userId]
  );

  // Streak rank
  const [streakRank] = await db.execute(
    `SELECT COUNT(*) + 1 AS \`rank\` FROM user_stats WHERE checkin_streak >
     (SELECT checkin_streak FROM user_stats WHERE user_id = ?)`,
    [userId]
  );

  return {
    pointsRank: pointsRank[0]?.rank || 0,
    studyRank: studyRank[0]?.rank || 0,
    streakRank: streakRank[0]?.rank || 0
  };
}

module.exports = {
  getPointsLeaderboard,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
  getStudyLeaderboard,
  getStreakLeaderboard,
  getMyRank
};
