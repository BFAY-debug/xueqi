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
    if (nickname !== undefined && (typeof nickname !== 'string' || nickname.length > 50)) {
      return res.error('昵称不能超过 50 字', 400);
    }
    if (bio !== undefined && typeof bio === 'string' && bio.length > 200) {
      return res.error('签名不能超过 200 字', 400);
    }
    if (email !== undefined && email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.error('邮箱格式不正确', 400);
      }
      if (email.length > 100) {
        return res.error('邮箱不能超过 100 字', 400);
      }
    }
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
