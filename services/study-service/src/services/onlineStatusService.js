const { redis, logger } = require('xueqi-shared');

const ONLINE_KEY = 'online:users';
const ONLINE_INFO_PREFIX = 'online:user:';

async function userOnline(userId, username, avatarUrl) {
  try {
    await redis.sadd(ONLINE_KEY, userId);
    await redis.hset(ONLINE_INFO_PREFIX + userId, {
      username,
      avatarUrl: avatarUrl || '',
      lastSeen: Date.now()
    });
  } catch (e) {
    logger.warn(`Redis online set failed: ${e.message}`);
  }
}

async function userOffline(userId) {
  try {
    await redis.srem(ONLINE_KEY, userId);
    await redis.del(ONLINE_INFO_PREFIX + userId);
  } catch (e) {
    logger.warn(`Redis offline set failed: ${e.message}`);
  }
}

async function isOnline(userId) {
  try {
    return await redis.sismember(ONLINE_KEY, String(userId));
  } catch (e) {
    return false;
  }
}

async function getOnlineUsers() {
  try {
    const ids = await redis.smembers(ONLINE_KEY);
    if (!ids.length) return [];

    // Batch fetch all user info via pipeline
    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.hgetall(ONLINE_INFO_PREFIX + id);
    }
    const results = await pipeline.exec();

    const users = [];
    for (let i = 0; i < ids.length; i++) {
      const info = results[i]?.[1];
      if (info?.username) {
        users.push({
          userId: parseInt(ids[i], 10),
          username: info.username,
          avatarUrl: info.avatarUrl || null
        });
      }
    }
    return users;
  } catch (e) {
    logger.warn(`Redis get online users failed: ${e.message}`);
    return [];
  }
}

async function getOnlineCount() {
  try {
    return await redis.scard(ONLINE_KEY);
  } catch (e) {
    return 0;
  }
}

module.exports = {
  userOnline,
  userOffline,
  isOnline,
  getOnlineUsers,
  getOnlineCount
};
