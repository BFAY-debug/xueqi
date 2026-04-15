const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * Get comments for a post (tree structure)
 */
async function getComments(postId, page = 1, pageSize = 50) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 50;
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT c.*,
            CASE WHEN c.is_anonymous = 1 THEN '匿名学子' ELSE u.nickname END AS author_name,
            CASE WHEN c.is_anonymous = 1 THEN NULL ELSE u.avatar_url END AS author_avatar,
            CASE WHEN c.is_anonymous = 1 THEN NULL ELSE l.badge END AS author_badge
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN user_stats us ON us.user_id = c.user_id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE c.post_id = ? AND c.status = 'published'
     ORDER BY c.created_at ASC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [postId]
  );

  const [countRows] = await db.execute(
    "SELECT COUNT(*) AS total FROM comments WHERE post_id = ? AND status = 'published'",
    [postId]
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Create comment (status=pending)
 */
async function createComment(postId, userId, { content, parentId, isAnonymous }) {
  // Verify post exists and is published
  const [posts] = await db.execute("SELECT id FROM posts WHERE id = ? AND status = 'published'", [postId]);
  if (posts.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }

  // Verify parent comment exists if specified
  if (parentId) {
    const [parents] = await db.execute('SELECT id FROM comments WHERE id = ? AND post_id = ?', [parentId, postId]);
    if (parents.length === 0) {
      const error = new Error('父评论不存在');
      error.status = 404;
      throw error;
    }
  }

  const [result] = await db.execute(
    `INSERT INTO comments (post_id, user_id, parent_id, content, is_anonymous, status)
     VALUES (?, ?, ?, ?, ?, 'published')`,
    [postId, userId, parentId || null, content, isAnonymous ? 1 : 0]
  );

  // Immediately increment comment count
  await db.execute(
    'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?',
    [postId]
  );

  // Award points immediately
  try {
    const token = getServiceToken();
    await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
      userId,
      action: 'comment',
      description: '发表评论'
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    logger.warn(`Failed to award comment points: ${err.message}`);
  }

  return { commentId: result.insertId, status: 'published' };
}

/**
 * Delete comment
 */
async function deleteComment(commentId, userId, roleName) {
  const [rows] = await db.execute('SELECT * FROM comments WHERE id = ?', [commentId]);
  if (rows.length === 0) {
    const error = new Error('评论不存在');
    error.status = 404;
    throw error;
  }

  if (rows[0].user_id !== userId && !['admin', 'super_admin'].includes(roleName)) {
    const error = new Error('无权删除此评论');
    error.status = 403;
    throw error;
  }

  await db.execute('DELETE FROM comments WHERE id = ?', [commentId]);

  // Update post comment count
  await db.execute(
    'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
    [rows[0].post_id]
  );

  return { deleted: true };
}

/**
 * Toggle like on a comment
 */
async function toggleLikeComment(commentId, userId) {
  const [comments] = await db.execute('SELECT id FROM comments WHERE id = ?', [commentId]);
  if (comments.length === 0) {
    const error = new Error('评论不存在');
    error.status = 404;
    throw error;
  }

  const [existing] = await db.execute(
    'SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?',
    [userId, commentId]
  );

  if (existing.length > 0) {
    await db.execute('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
    await db.execute('UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [commentId]);
    return { liked: false };
  } else {
    await db.execute('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)', [userId, commentId]);
    await db.execute('UPDATE comments SET like_count = like_count + 1 WHERE id = ?', [commentId]);
    return { liked: true };
  }
}

/**
 * Get my comments
 */
async function getMyComments(userId, page = 1, pageSize = 20) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT c.*, p.title AS post_title
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM comments WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

module.exports = {
  getComments,
  createComment,
  deleteComment,
  toggleLikeComment,
  getMyComments
};

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({ userId: 0, username: 'community-service', roleId: 1, roleName: 'super_admin' });
}
