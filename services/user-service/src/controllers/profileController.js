const userService = require('../services/userService');

async function getMyProfile(req, res, next) {
  try {
    const profile = await userService.getMyProfile(req.user.userId);
    res.success(profile);
  } catch (err) {
    next(err);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const { nickname, bio, email } = req.body;
    const profile = await userService.updateProfile(req.user.userId, { nickname, bio, email });
    res.success(profile, '资料更新成功');
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const profile = await userService.getPublicProfile(parseInt(req.params.id, 10));
    res.success(profile);
  } catch (err) {
    next(err);
  }
}

async function getUserStats(req, res, next) {
  try {
    const stats = await userService.getUserStats(parseInt(req.params.id, 10));
    res.success(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProfile, updateMyProfile, getUserById, getUserStats };
