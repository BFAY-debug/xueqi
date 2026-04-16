const postService = require('../services/postService');

async function listPosts(req, res, next) {
  try {
    const { page, pageSize, category, tag, keyword, sort } = req.query;
    const result = await postService.getPosts({ page, pageSize, category, tag, keyword, sort });
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  } catch (err) { next(err); }
}

async function getPost(req, res, next) {
  try {
    const post = await postService.getPostById(parseInt(req.params.id, 10));
    res.success(post);
  } catch (err) { next(err); }
}

async function createPost(req, res, next) {
  try {
    const { title, content, summary, category, isAnonymous, tags, permission, contentType } = req.body;
    if (!title || !content) {
      return res.error('标题和内容不能为空', 400);
    }
    const result = await postService.createPost(req.user.userId,
      { title, content, summary, category, isAnonymous, tags, permission, contentType });
    res.success(result, '文章已发布', 201);
  } catch (err) { next(err); }
}

async function updatePost(req, res, next) {
  try {
    const result = await postService.updatePost(parseInt(req.params.id, 10), req.user.userId, req.body);
    res.success(result, '文章已更新');
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    await postService.deletePost(parseInt(req.params.id, 10), req.user.userId, req.user.roleName);
    res.success(null, '帖子已删除');
  } catch (err) { next(err); }
}

async function likePost(req, res, next) {
  try {
    const result = await postService.toggleLikePost(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, result.liked ? '已点赞' : '已取消点赞');
  } catch (err) { next(err); }
}

async function getMyPosts(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await postService.getMyPosts(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function getVersions(req, res, next) {
  try {
    const versions = await postService.getVersions(parseInt(req.params.id, 10));
    res.success(versions);
  } catch (err) { next(err); }
}

async function getVersion(req, res, next) {
  try {
    const version = await postService.getVersion(parseInt(req.params.id, 10), parseInt(req.params.version, 10));
    res.success(version);
  } catch (err) { next(err); }
}

async function rollbackVersion(req, res, next) {
  try {
    const result = await postService.rollbackVersion(
      parseInt(req.params.id, 10),
      parseInt(req.params.version, 10),
      req.user.userId
    );
    res.success(result, `已回滚至 v${req.params.version}`);
  } catch (err) { next(err); }
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, likePost, getMyPosts, getVersions, getVersion, rollbackVersion };
