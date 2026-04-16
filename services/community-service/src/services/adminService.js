const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// ── Post Review ───────────────────────────────────────

async function getPendingPosts(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT p.*, u.username, u.nickname
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.status = 'pending'
     ORDER BY p.created_at ASC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );

  const [countRows] = await db.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'pending'");

  return { data: rows, total: countRows[0].total };
}

async function reviewPost(postId, adminId, { action, reason }) {
  const [rows] = await db.execute("SELECT * FROM posts WHERE id = ? AND status = 'pending'", [postId]);
  if (rows.length === 0) {
    const error = new Error('帖子不存在或已审核');
    error.status = 404;
    throw error;
  }

  const post = rows[0];
  const newStatus = action === 'approve' ? 'published' : 'rejected';

  await db.execute(
    `UPDATE posts SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reject_reason = ? WHERE id = ?`,
    [newStatus, adminId, action === 'reject' ? reason : null, postId]
  );

  // Log review
  await db.execute(
    `INSERT INTO review_logs (reviewer_id, target_type, target_id, action, reason) VALUES (?, 'post', ?, ?, ?)`,
    [adminId, postId, action, reason || null]
  );

  // If approved, award points
  if (action === 'approve') {
    try {
      const token = getServiceToken();
      await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
        userId: post.user_id,
        action: 'post',
        description: '发帖通过审核'
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      logger.warn(`Failed to award post points: ${err.message}`);
    }
  }

  // Notify author
  const title = action === 'approve' ? '帖子审核通过' : '帖子未通过审核';
  const content = action === 'approve'
    ? `你的帖子「${post.title}」已通过审核并发布。`
    : `你的帖子「${post.title}」未通过审核。${reason ? '原因：' + reason : ''}`;

  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'review_result', ?, ?, ?, 'post')`,
    [post.user_id, title, content, postId]
  );

  return { postId, status: newStatus };
}

async function togglePin(postId, pinned) {
  await db.execute('UPDATE posts SET is_pinned = ? WHERE id = ?', [pinned ? 1 : 0, postId]);
  return { postId, isPinned: !!pinned };
}

async function toggleFeature(postId, featured) {
  await db.execute('UPDATE posts SET is_featured = ? WHERE id = ?', [featured ? 1 : 0, postId]);
  return { postId, isFeatured: !!featured };
}

/**
 * Hide or unhide a post (set status to 'hidden' or 'published')
 */
async function toggleHidePost(postId, hidden) {
  const [rows] = await db.execute('SELECT * FROM posts WHERE id = ?', [postId]);
  if (rows.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }
  const newStatus = hidden ? 'hidden' : 'published';
  await db.execute('UPDATE posts SET status = ? WHERE id = ?', [newStatus, postId]);
  return { postId, status: newStatus };
}

/**
 * Admin edit any post (title, content)
 */
async function adminEditPost(postId, adminId, { title, content }) {
  const [rows] = await db.execute('SELECT * FROM posts WHERE id = ?', [postId]);
  if (rows.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }

  const post = rows[0];
  const newVersion = post.version + 1;

  await db.execute(
    'UPDATE posts SET title = ?, content = ?, version = ? WHERE id = ?',
    [title || post.title, content || post.content, newVersion, postId]
  );

  // Record version history
  await db.execute(
    `INSERT INTO post_versions (post_id, version, title, content, edit_summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [postId, newVersion, title || post.title, content || post.content, '管理员编辑', adminId]
  );

  return { postId, version: newVersion };
}

// ── Comment Review ────────────────────────────────────

async function getPendingComments(page = 1, pageSize = 20) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT c.*, u.username, u.nickname, p.title AS post_title
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id
     WHERE c.status = 'pending'
     ORDER BY c.created_at ASC
     LIMIT ${pageSize} OFFSET ${offset}`,
    []
  );

  const [countRows] = await db.execute("SELECT COUNT(*) AS total FROM comments WHERE status = 'pending'");

  return { data: rows, total: countRows[0].total };
}

async function reviewComment(commentId, adminId, { action, reason }) {
  const [rows] = await db.execute("SELECT * FROM comments WHERE id = ? AND status != 'rejected'", [commentId]);
  if (rows.length === 0) {
    const error = new Error('评论不存在或已处理');
    error.status = 404;
    throw error;
  }

  const comment = rows[0];
  const newStatus = action === 'approve' ? 'published' : 'rejected';

  await db.execute(
    `UPDATE comments SET status = ? WHERE id = ?`,
    [newStatus, commentId]
  );

  // Log review
  await db.execute(
    `INSERT INTO review_logs (reviewer_id, target_type, target_id, action, reason) VALUES (?, 'comment', ?, ?, ?)`,
    [adminId, commentId, action, reason || null]
  );

  // If rejecting a published comment, decrease count
  if (action === 'reject' && comment.status === 'published') {
    await db.execute(
      'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
      [comment.post_id]
    );
  }

  // If approving a pending comment (edge case after migration), increase count
  if (action === 'approve' && comment.status === 'pending') {
    await db.execute('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [comment.post_id]);

    try {
      const token = getServiceToken();
      await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
        userId: comment.user_id,
        action: 'comment',
        description: '评论通过审核'
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      logger.warn(`Failed to award comment points: ${err.message}`);
    }
  }

  // Notify author
  const title = action === 'approve' ? '评论审核通过' : '评论已被删除';
  const content = action === 'approve'
    ? '你的评论已通过审核。'
    : `你的评论已被管理员删除。${reason ? '原因：' + reason : ''}`;

  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'review_result', ?, ?, ?, 'comment')`,
    [comment.user_id, title, content, commentId]
  );

  return { commentId, status: newStatus };
}

// ── Admin: All Posts & Delete ──────────────────────────

async function getAllPosts({ page = 1, pageSize = 20, status = '' }) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  const [rows] = await db.execute(
    `SELECT p.id, p.title, p.category, p.status, p.is_pinned, p.is_featured,
            p.view_count, p.like_count, p.comment_count, p.created_at,
            u.nickname AS author_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY p.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM posts p WHERE ${where}`, params);
  return { data: rows, total: countRows[0].total };
}

async function deletePost(postId) {
  const [rows] = await db.execute('SELECT id FROM posts WHERE id = ?', [postId]);
  if (rows.length === 0) {
    const error = new Error('文章不存在');
    error.status = 404;
    throw error;
  }
  // CASCADE will delete post_versions, edit_proposals, post_tags, post_bookmarks, post_likes, comments
  await db.execute('DELETE FROM posts WHERE id = ?', [postId]);
  return { deleted: true };
}

// ── Admin: All Comments & Delete ──────────────────────

async function getAllComments({ page = 1, pageSize = 20, postId = '' }) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;
  const conditions = ["c.status = 'published'"];
  const params = [];

  if (postId) {
    conditions.push('c.post_id = ?');
    params.push(parseInt(postId, 10));
  }

  const where = conditions.join(' AND ');

  const [rows] = await db.execute(
    `SELECT c.id, c.post_id, c.content, c.is_anonymous, c.like_count, c.created_at,
            u.nickname AS author_name, p.title AS post_title
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM comments c WHERE ${where}`, params);
  return { data: rows, total: countRows[0].total };
}

async function deleteComment(commentId) {
  const [rows] = await db.execute('SELECT * FROM comments WHERE id = ?', [commentId]);
  if (rows.length === 0) {
    const error = new Error('评论不存在');
    error.status = 404;
    throw error;
  }
  const comment = rows[0];
  await db.execute('DELETE FROM comments WHERE id = ?', [commentId]);
  if (comment.status === 'published') {
    await db.execute(
      'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
      [comment.post_id]
    );
  }
  return { deleted: true };
}

// ── Review Logs ───────────────────────────────────────

async function getReviewLogs({ page = 1, pageSize = 20, targetType = '' }) {
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];

  if (targetType) {
    conditions.push('rl.target_type = ?');
    params.push(targetType);
  }

  const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  const [rows] = await db.execute(
    `SELECT rl.*, u.username AS reviewer_name
     FROM review_logs rl
     JOIN users u ON u.id = rl.reviewer_id
     WHERE ${where}
     ORDER BY rl.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM review_logs rl WHERE ${where}`, params);

  return { data: rows, total: countRows[0].total };
}

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({ userId: 0, username: 'community-service', roleId: 1, roleName: 'super_admin' });
}

module.exports = {
  getPendingPosts, reviewPost, togglePin, toggleFeature, toggleHidePost, adminEditPost,
  getPendingComments, reviewComment,
  getReviewLogs,
  getAllPosts, deletePost, getAllComments, deleteComment
};
