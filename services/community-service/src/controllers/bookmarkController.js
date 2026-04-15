const bookmarkService = require('../services/bookmarkService');

async function toggleBookmark(req, res, next) {
  try {
    const result = await bookmarkService.toggleBookmark(req.user.userId, req.params.postId);
    res.success(result, result.bookmarked ? '已收藏' : '已取消收藏');
  } catch (err) { next(err); }
}

async function getMyBookmarks(req, res, next) {
  try {
    const { page, pageSize } = req.query;
    const result = await bookmarkService.getMyBookmarks(req.user.userId, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    });
    res.success(result.data, 'Success').json({ ...res.successData, total: result.total });
  } catch (err) { next(err); }
}

module.exports = {
  toggleBookmark,
  getMyBookmarks
};
