const { db } = require('xueqi-shared');

/**
 * Toggle bookmark on a post
 */
async function toggleBookmark(userId, postId) {
  // Check post exists
  const [posts] = await db.execute(
    "SELECT id FROM posts WHERE id = ? AND status = 'published'",
    [postId]
  );
  if (posts.length === 0) {
    const error = new Error('文章不存在');
    error.status = 404;
    throw error;
  }

  const [existing] = await db.execute(
    'SELECT * FROM post_bookmarks WHERE user_id = ? AND post_id = ?',
    [userId, postId]
  );

  if (existing.length > 0) {
    await db.execute(
      'DELETE FROM post_bookmarks WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    await db.execute(
      'UPDATE posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = ?',
      [postId]
    );
    return { bookmarked: false };
  } else {
    await db.execute(
      'INSERT INTO post_bookmarks (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );
    await db.execute(
      'UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = ?',
      [postId]
    );
    return { bookmarked: true };
  }
}

/**
 * Get user's bookmarked posts
 */
async function getMyBookmarks(userId, { page = 1, pageSize = 20 }) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT p.*, pb.created_at AS bookmarked_at,
            u.nickname AS author_name, u.avatar_url AS author_avatar
     FROM post_bookmarks pb
     JOIN posts p ON p.id = pb.post_id
     JOIN users u ON u.id = p.user_id
     WHERE pb.user_id = ? AND p.status = 'published'
     ORDER BY pb.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM post_bookmarks pb JOIN posts p ON p.id = pb.post_id WHERE pb.user_id = ? AND p.status = \'published\'',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Check if user has bookmarked a post
 */
async function isBookmarked(userId, postId) {
  const [rows] = await db.execute(
    'SELECT 1 FROM post_bookmarks WHERE user_id = ? AND post_id = ?',
    [userId, postId]
  );
  return rows.length > 0;
}

module.exports = {
  toggleBookmark,
  getMyBookmarks,
  isBookmarked
};
