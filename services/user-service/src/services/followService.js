const { db, logger } = require('xueqi-shared');

async function toggleFollow(followerId, followingId) {
  if (followerId === followingId) {
    const error = new Error('不能关注自己');
    error.status = 400;
    throw error;
  }

  const [existing] = await db.execute(
    'SELECT * FROM user_follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId]
  );

  if (existing.length > 0) {
    await db.execute(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
    await db.execute(
      'UPDATE user_stats SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = ?',
      [followerId]
    );
    await db.execute(
      'UPDATE user_stats SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = ?',
      [followingId]
    );
    return { following: false };
  }

  await db.execute(
    'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)',
    [followerId, followingId]
  );
  await db.execute(
    'UPDATE user_stats SET following_count = following_count + 1 WHERE user_id = ?',
    [followerId]
  );
  await db.execute(
    'UPDATE user_stats SET follower_count = follower_count + 1 WHERE user_id = ?',
    [followingId]
  );
  return { following: true };
}

async function isFollowing(followerId, followingId) {
  const [rows] = await db.execute(
    'SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId]
  );
  return rows.length > 0;
}

async function getFollowers(userId, page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 100);
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.avatar_url, uf.created_at AS followed_at
     FROM user_follows uf
     JOIN users u ON u.id = uf.follower_id
     WHERE uf.following_id = ? AND u.status = 1
     ORDER BY uf.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM user_follows uf JOIN users u ON u.id = uf.follower_id WHERE uf.following_id = ? AND u.status = 1',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

async function getFollowing(userId, page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 100);
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.avatar_url, uf.created_at AS followed_at
     FROM user_follows uf
     JOIN users u ON u.id = uf.following_id
     WHERE uf.follower_id = ? AND u.status = 1
     ORDER BY uf.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM user_follows uf JOIN users u ON u.id = uf.following_id WHERE uf.follower_id = ? AND u.status = 1',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

module.exports = { toggleFollow, isFollowing, getFollowers, getFollowing };
