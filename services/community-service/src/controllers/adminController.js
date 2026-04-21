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
  toggleHidePost, adminEditPost,
  getPendingComments, reviewComment, getReviewLogs,
  getAllPosts, deletePost, getAllComments, deleteComment,
  getPendingProposals, adminMergeProposal, adminRejectProposal
};

async function getAllPosts(req, res, next) {
  try {
    const { page, pageSize, status } = req.query;
    const result = await adminService.getAllPosts({ page, pageSize, status });
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    await adminService.deletePost(parseInt(req.params.id, 10));
    res.success(null, '文章已删除');
  } catch (err) { next(err); }
}

async function getAllComments(req, res, next) {
  try {
    const { page, pageSize, postId } = req.query;
    const result = await adminService.getAllComments({ page, pageSize, postId });
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  } catch (err) { next(err); }
}

async function deleteComment(req, res, next) {
  try {
    await adminService.deleteComment(parseInt(req.params.id, 10));
    res.success(null, '评论已删除');
  } catch (err) { next(err); }
}

async function toggleHidePost(req, res, next) {
  try {
    const { hidden } = req.body;
    const result = await adminService.toggleHidePost(parseInt(req.params.id, 10), hidden);
    res.success(result, hidden ? '文章已隐藏' : '文章已恢复');
  } catch (err) { next(err); }
}

async function adminEditPost(req, res, next) {
  try {
    const { title, content } = req.body;
    const result = await adminService.adminEditPost(parseInt(req.params.id, 10), req.user.userId, { title, content });
    res.success(result, '文章已更新');
  } catch (err) { next(err); }
}

async function getPendingProposals(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await adminService.getPendingProposals(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function adminMergeProposal(req, res, next) {
  try {
    const result = await adminService.adminMergeProposal(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '提案已合并');
  } catch (err) { next(err); }
}

async function adminRejectProposal(req, res, next) {
  try {
    const { reason } = req.body;
    const result = await adminService.adminRejectProposal(parseInt(req.params.id, 10), req.user.userId, reason);
    res.success(result, '提案已拒绝');
  } catch (err) { next(err); }
}
