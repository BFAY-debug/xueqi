const adminService = require('../services/adminService');

async function getPendingPosts(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await adminService.getPendingPosts(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function reviewPost(req, res, next) {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.error('action 必须为 approve 或 reject', 400);
    }
    const result = await adminService.reviewPost(parseInt(req.params.id, 10), req.user.userId, { action, reason });
    res.success(result, action === 'approve' ? '帖子已通过审核' : '帖子已拒绝');
  } catch (err) { next(err); }
}

async function togglePin(req, res, next) {
  try {
    const { pinned } = req.body;
    const result = await adminService.togglePin(parseInt(req.params.id, 10), pinned);
    res.success(result, pinned ? '已置顶' : '已取消置顶');
  } catch (err) { next(err); }
}

async function toggleFeature(req, res, next) {
  try {
    const { featured } = req.body;
    const result = await adminService.toggleFeature(parseInt(req.params.id, 10), featured);
    res.success(result, featured ? '已精选' : '已取消精选');
  } catch (err) { next(err); }
}

async function getPendingComments(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await adminService.getPendingComments(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function reviewComment(req, res, next) {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.error('action 必须为 approve 或 reject', 400);
    }
    const result = await adminService.reviewComment(parseInt(req.params.id, 10), req.user.userId, { action, reason });
    res.success(result, action === 'approve' ? '评论已通过审核' : '评论已拒绝');
  } catch (err) { next(err); }
}

async function getReviewLogs(req, res, next) {
  try {
    const { page, pageSize, targetType } = req.query;
    const result = await adminService.getReviewLogs({ page, pageSize, targetType });
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  } catch (err) { next(err); }
}

module.exports = {
  getPendingPosts, reviewPost, togglePin, toggleFeature,
  getPendingComments, reviewComment, getReviewLogs
};
