const friendService = require('../services/friendService');

async function sendRequest(req, res, next) {
  try {
    const { toUserId, message } = req.body;
    const result = await friendService.sendRequest(req.user.userId, toUserId, message);
    res.success(result);
  } catch (err) {
    next(err);
  }
}

async function acceptRequest(req, res, next) {
  try {
    const result = await friendService.acceptRequest(parseInt(req.params.id, 10), req.user.userId);
    res.success(result);
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    await friendService.rejectRequest(parseInt(req.params.id, 10), req.user.userId);
    res.success(null, '已拒绝好友请求');
  } catch (err) {
    next(err);
  }
}

async function getFriendRequests(req, res, next) {
  try {
    const type = req.query.type || 'incoming';
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await friendService.getFriendRequests(req.user.userId, type, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getUnreadRequestCount(req, res, next) {
  try {
    const count = await friendService.getUnreadRequestCount(req.user.userId);
    res.success({ count });
  } catch (err) {
    next(err);
  }
}

async function getFriends(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await friendService.getFriends(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function deleteFriend(req, res, next) {
  try {
    await friendService.deleteFriend(req.user.userId, parseInt(req.params.userId, 10));
    res.success(null, '已删除好友');
  } catch (err) {
    next(err);
  }
}

async function getFriendStatus(req, res, next) {
  try {
    const status = await friendService.getFriendStatus(req.user.userId, parseInt(req.params.targetUserId, 10));
    res.success({ status });
  } catch (err) {
    next(err);
  }
}

async function blockUser(req, res, next) {
  try {
    const { userId } = req.body;
    await friendService.blockUser(req.user.userId, userId);
    res.success(null, '已屏蔽该用户');
  } catch (err) {
    next(err);
  }
}

async function unblockUser(req, res, next) {
  try {
    await friendService.unblockUser(req.user.userId, parseInt(req.params.userId, 10));
    res.success(null, '已取消屏蔽');
  } catch (err) {
    next(err);
  }
}

async function getBlockedUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await friendService.getBlockedUsers(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function checkFriendship(req, res, next) {
  try {
    const { userId1, userId2 } = req.query;
    const areFriends = await friendService.areFriends(parseInt(userId1, 10), parseInt(userId2, 10));
    res.success({ areFriends });
  } catch (err) {
    next(err);
  }
}

async function searchUsers(req, res, next) {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await friendService.searchUsers(req.user.userId, query, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getFriendRequests,
  getUnreadRequestCount,
  getFriends,
  deleteFriend,
  getFriendStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkFriendship,
  searchUsers
};
