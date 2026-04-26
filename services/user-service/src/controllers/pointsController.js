const pointsService = require('../services/pointsService');

async function getPoints(req, res, next) {
  try {
    const data = await pointsService.getMyPoints(req.user.userId);
    res.success(data);
  } catch (err) {
    next(err);
  }
}

async function getPointsLog(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await pointsService.getPointsLog(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/**
 * Internal API: Award points (called by other services)
 */
async function awardPoints(req, res, next) {
  try {
    const { userId, action, points, description } = req.body;
    if (!userId || !action) {
      return res.error('缺少必填参数：用户ID和操作类型', 400);
    }
    const result = await pointsService.awardPoints(userId, action, { points, description });
    res.success(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Internal API: Update checkin streak (called by study-service on session start)
 */
async function updateCheckinStreak(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.error('缺少用户ID', 400);
    }
    const result = await pointsService.updateCheckinStreak(userId);
    res.success(result);
  } catch (err) {
    next(err);
  }
}

async function dailyCheckin(req, res, next) {
  try {
    const result = await pointsService.updateCheckinStreak(req.user.userId);
    res.success(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getPoints, getPointsLog, awardPoints, updateCheckinStreak, dailyCheckin };
