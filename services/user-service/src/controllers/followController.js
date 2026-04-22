const followService = require('../services/followService');
const { logger } = require('xueqi-shared');

async function toggleFollow(req, res, next) {
  try {
    const followingId = parseInt(req.params.userId, 10);
    logger.info(`toggleFollow: ${req.user.userId} -> ${followingId}`);
    const result = await followService.toggleFollow(req.user.userId, followingId);
    logger.info(`toggleFollow result: ${JSON.stringify(result)}`);
    res.success(result);
  } catch (err) {
    next(err);
  }
}

async function checkFollowing(req, res, next) {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const following = await followService.isFollowing(req.user.userId, targetUserId);
    res.success({ following });
  } catch (err) {
    next(err);
  }
}

async function getFollowers(req, res, next) {
  try {
    const userId = parseInt(req.params.userId, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const result = await followService.getFollowers(userId, page, pageSize);
    res.paginate(result.data, result.total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getFollowing(req, res, next) {
  try {
    const userId = parseInt(req.params.userId, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const result = await followService.getFollowing(userId, page, pageSize);
    res.paginate(result.data, result.total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

module.exports = { toggleFollow, checkFollowing, getFollowers, getFollowing };
