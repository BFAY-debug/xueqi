const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * List published posts (public)
 */
async function getPosts({ page = 1, pageSize = 20, category = '', tag = '', keyword = '', sort = 'latest' }) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
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
  if (keyword) {
    conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const where = conditions.join(' AND ');

  let orderBy = 'p.is_pinned DESC, p.created_at DESC';
  if (sort === 'hot') orderBy = 'p.is_pinned DESC, p.view_count DESC, p.like_count DESC';
  if (sort === 'bookmarks') orderBy = 'p.is_pinned DESC, p.bookmark_count DESC, p.created_at DESC';

  const [rows] = await db.execute(
    `SELECT p.id, p.title, p.summary, p.content_type, p.version, p.category, p.is_anonymous,
            p.is_pinned, p.is_featured, p.view_count, p.like_count, p.comment_count,
            p.bookmark_count, p.created_at,
            CASE WHEN p.is_anonymous = 1 THEN '匿名学子' ELSE u.nickname END AS author_name,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.avatar_url END AS author_avatar,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE l.badge END AS author_badge,
            CASE WHEN p.is_anonymous = 1 THEN NULL ELSE l.name END AS author_level
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN user_stats us ON us.user_id = p.user_id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
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
 * Create post (user, status=published — direct publish, no review needed)
 */
async function createPost(userId, { title, content, summary, category, isAnonymous, tags, permission, contentType }) {
  const [result] = await db.execute(
    `INSERT INTO posts (user_id, title, content, summary, category, is_anonymous, permission, content_type, version, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'published')`,
    [userId, title, content, summary || null, category || 'general', isAnonymous ? 1 : 0,
     permission || 'public', contentType || 'markdown']
  );

  const postId = result.insertId;

  // Record initial version
  await db.execute(
    `INSERT INTO post_versions (post_id, version, title, content, edit_summary, created_by)
     VALUES (?, 1, ?, ?, '创建文章', ?)`,
    [postId, title, content, userId]
  );

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

  // Award points for publishing a post
  try {
    const token = getServiceToken();
    await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
      userId,
      action: 'post',
      description: '发表文章'
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    logger.warn(`Failed to award post points: ${err.message}`);
  }

  return { postId, status: 'published' };
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

  // Increment version
  updates.push('version = version + 1');

  // Keep published status on edit (no re-review needed)
  updates.push("status = 'published'");
  params.push(postId);
  await db.execute(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, params);

  // Record version history
  const newVersion = rows[0].version + 1;
  await db.execute(
    `INSERT INTO post_versions (post_id, version, title, content, edit_summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [postId, newVersion,
     data.title !== undefined ? data.title : rows[0].title,
     data.content !== undefined ? data.content : rows[0].content,
     data.editSummary || '作者编辑',
     userId]
  );

  return { postId, status: 'published', version: newVersion };
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
    `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
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

/**
 * Get version history for a post
 */
async function getVersions(postId) {
  const [rows] = await db.execute(
    `SELECT pv.id, pv.version, pv.title, pv.edit_summary, pv.created_by, pv.created_at,
            u.nickname AS editor_name
     FROM post_versions pv
     LEFT JOIN users u ON u.id = pv.created_by
     WHERE pv.post_id = ?
     ORDER BY pv.version DESC`,
    [postId]
  );
  return rows;
}

/**
 * Get a specific version of a post
 */
async function getVersion(postId, version) {
  const [rows] = await db.execute(
    `SELECT pv.*, u.nickname AS editor_name
     FROM post_versions pv
     LEFT JOIN users u ON u.id = pv.created_by
     WHERE pv.post_id = ? AND pv.version = ?`,
    [postId, version]
  );
  if (rows.length === 0) {
    const error = new Error('版本不存在');
    error.status = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Rollback a post to a specific version
 */
async function rollbackVersion(postId, version, userId) {
  const [postRows] = await db.execute('SELECT * FROM posts WHERE id = ?', [postId]);
  if (postRows.length === 0) {
    const error = new Error('帖子不存在');
    error.status = 404;
    throw error;
  }

  const [versionRows] = await db.execute(
    'SELECT * FROM post_versions WHERE post_id = ? AND version = ?',
    [postId, version]
  );
  if (versionRows.length === 0) {
    const error = new Error('版本不存在');
    error.status = 404;
    throw error;
  }

  const v = versionRows[0];

  // Update post content to this version
  await db.execute(
    'UPDATE posts SET title = ?, content = ?, version = version + 1 WHERE id = ?',
    [v.title, v.content, postId]
  );

  // Record rollback as a new version
  const newVersion = postRows[0].version + 1;
  await db.execute(
    `INSERT INTO post_versions (post_id, version, title, content, edit_summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [postId, newVersion, v.title, v.content, `回滚至 v${version}`, userId]
  );

  return { postId, version: newVersion, rollbackFrom: version };
}

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  getMyPosts,
  getVersions,
  getVersion,
  rollbackVersion,
  getUserPublicPosts
};

async function getUserPublicPosts(userId, page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 50);
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT p.id, p.title, p.summary, p.category, p.view_count, p.like_count, p.comment_count,
            p.created_at, p.is_featured, p.is_pinned, p.version
     FROM posts p
     WHERE p.user_id = ? AND p.status = 'published'
     ORDER BY p.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    "SELECT COUNT(*) AS total FROM posts WHERE user_id = ? AND status = 'published'",
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}
