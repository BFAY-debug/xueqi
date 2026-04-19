const { redis, logger } = require('xueqi-shared');

const ONLINE_KEY = 'online:users';
const ONLINE_INFO_PREFIX = 'online:user:';

async function userOnline(userId, nickname, avatarUrl) {
  try {
    await redis.sadd(ONLINE_KEY, userId);
    await redis.hset(ONLINE_INFO_PREFIX + userId, {
      nickname,
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
    const users = [];
    for (const id of ids) {
      const info = await redis.hgetall(ONLINE_INFO_PREFIX + id);
      if (info.nickname) {
        users.push({
          userId: parseInt(id, 10),
          nickname: info.nickname,
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
