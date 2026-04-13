const leaderboardService = require('../services/leaderboardService');

async function getPointsLeaderboard(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const { data, total } = await leaderboardService.getPointsLeaderboard(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getWeeklyLeaderboard(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const { data, total } = await leaderboardService.getWeeklyLeaderboard(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getMonthlyLeaderboard(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const { data, total } = await leaderboardService.getMonthlyLeaderboard(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getStudyLeaderboard(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const { data, total } = await leaderboardService.getStudyLeaderboard(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getStreakLeaderboard(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const { data, total } = await leaderboardService.getStreakLeaderboard(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getMyRank(req, res, next) {
  try {
    const rank = await leaderboardService.getMyRank(req.user.userId);
    res.success(rank);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPointsLeaderboard,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
  getStudyLeaderboard,
  getStreakLeaderboard,
  getMyRank
};
