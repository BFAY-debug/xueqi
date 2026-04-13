const commentService = require('../services/commentService');

async function getComments(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const { data, total } = await commentService.getComments(parseInt(req.params.postId, 10), page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function createComment(req, res, next) {
  try {
    const { content, parentId, isAnonymous } = req.body;
    if (!content) {
      return res.error('评论内容不能为空', 400);
    }
    const result = await commentService.createComment(
      parseInt(req.params.postId, 10), req.user.userId,
      { content, parentId, isAnonymous }
    );
    res.success(result, '评论已提交，等待审核', 201);
  } catch (err) { next(err); }
}

async function deleteComment(req, res, next) {
  try {
    await commentService.deleteComment(parseInt(req.params.id, 10), req.user.userId, req.user.roleName);
    res.success(null, '评论已删除');
  } catch (err) { next(err); }
}

async function likeComment(req, res, next) {
  try {
    const result = await commentService.toggleLikeComment(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, result.liked ? '已点赞' : '已取消点赞');
  } catch (err) { next(err); }
}

async function getMyComments(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await commentService.getMyComments(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

module.exports = { getComments, createComment, deleteComment, likeComment, getMyComments };
