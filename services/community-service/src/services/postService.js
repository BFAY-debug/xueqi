const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * List published posts (public)
 */
async function getPosts({ page = 1, pageSize = 20, category = '', tag = '' }) {
  const offset = (page - 1) * pageSize;
  const conditions = ["p.status = 'published'"];
  const params = [];

  if (category) {
    conditions.push('p.category = ?');
    params.push(category);
  }
  if (tag) {
    conditions.push(`p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = ?)`);
    params.push(tag);
  }

  const where = conditions.join(' AND ');

  const [rows] = await db.execute(
    `SELECT p.id, p.title, p.content, p.category, p.is_anonymous, p.is_pinned, p.is_featured,
            p.view_count, p.like_count, p.comment_count, p.created_at,
            CASE WHEN p.is_anonymous = 1 THEN '匿名学子' ELSE u.nickname END AS author_name,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.avatar_url END AS author_avatar,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE l.badge END AS author_badge,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE l.name END AS author_level
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN user_stats us ON us.user_id = p.user_id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE ${where}
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM posts p WHERE ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Get post detail
 */
async function getPostById(postId) {
  const [rows] = await db.execute(
    `SELECT p.*,
            CASE WHEN p.is_anonymous = 1 THEN '匿名学子' ELSE u.nickname END AS author_name,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.avatar_url END AS author_avatar,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE l.badge END AS author_badge,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE l.name END AS author_level
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN user_stats us ON us.user_id = p.user_id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE p.id = ?`,
    [postId]
  );

  if (rows.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }

  // Increment view count
  await db.execute(
    'UPDATE posts SET view_count = view_count + 1 WHERE id = ?',
    [postId]
  );

  const post = rows[0];
  post.view_count += 1;

  // Get tags
  const [tags] = await db.execute(
    `SELECT t.id, t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?`,
    [postId]
  );
  post.tags = tags;

  return post;
}

/**
 * Create post (user, status=pending)
 */
async function createPost(userId, { title, content, category, isAnonymous, tags }) {
  const [result] = await db.execute(
    `INSERT INTO posts (user_id, title, content, category, is_anonymous, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [userId, title, content, category || 'general', isAnonymous ? 1 : 0]
  );

  const postId = result.insertId;

  // Attach tags
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      // Find or create tag
      let [tagRows] = await db.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
      let tagId;
      if (tagRows.length === 0) {
        const [tagResult] = await db.execute('INSERT INTO tags (name) VALUES (?)', [tagName]);
        tagId = tagResult.insertId;
      } else {
        tagId = tagRows[0].id;
      }
      await db.execute(
        'INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        [postId, tagId]
      );
    }
  }

  return { postId, status: 'pending' };
}

/**
 * Update own post
 */
async function updatePost(postId, userId, data) {
  const [rows] = await db.execute(
    'SELECT * FROM posts WHERE id = ? AND user_id = ?',
    [postId, userId]
  );

  if (rows.length === 0) {
    const error = new Error('帖子不存在或无权编辑');
    error.status = 404;
    throw error;
  }

  const updates = [];
  const params = [];

  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.content !== undefined) { updates.push('content = ?'); params.push(data.content); }
  if (data.category !== undefined) { updates.push('category = ?'); params.push(data.category); }

  if (updates.length === 0) return getPostById(postId);

  // Re-submit for review if content changed
  updates.push("status = 'pending'");
  params.push(postId);
  await db.execute(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, params);

  return { postId, status: 'pending' };
}

/**
 * Delete post
 */
async function deletePost(postId, userId, roleName) {
  const [rows] = await db.execute('SELECT * FROM posts WHERE id = ?', [postId]);

  if (rows.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }

  // Only author or admin can delete
  if (rows[0].user_id !== userId && !['admin', 'super_admin'].includes(roleName)) {
    const error = new Error('无权删除此帖子');
    error.status = 403;
    throw error;
  }

  await db.execute('DELETE FROM posts WHERE id = ?', [postId]);
  return { deleted: true };
}

/**
 * Toggle like on a post
 */
async function toggleLikePost(postId, userId) {
  // Check post exists
  const [posts] = await db.execute('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
  if (posts.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }

  const [existing] = await db.execute(
    'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
    [userId, postId]
  );

  if (existing.length > 0) {
    // Unlike
    await db.execute('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
    await db.execute('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [postId]);
    return { liked: false };
  } else {
    // Like
    await db.execute('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
    await db.execute('UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [postId]);

    // Award points to post author
    if (posts[0].user_id !== userId) {
      try {
        const token = getServiceToken();
        await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
          userId: posts[0].user_id,
          action: 'post_liked',
          description: '帖子被点赞'
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        logger.warn(`Failed to award post liked points: ${err.message}`);
      }

      // Notify author
      await db.execute(
        `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
         VALUES (?, 'like', '你的帖子收到了新的赞', ?, ?, 'post')`,
        [posts[0].user_id, '有人赞了你的帖子', postId]
      );
    }

    return { liked: true };
  }
}

/**
 * Get my posts (including pending)
 */
async function getMyPosts(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM posts WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({ userId: 0, username: 'community-service', roleId: 1, roleName: 'super_admin' });
}

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  getMyPosts
};
