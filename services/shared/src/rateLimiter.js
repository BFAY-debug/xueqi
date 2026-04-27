/**
 * User-level rate limiter using Redis.
 * Uses Lua script for atomic INCR + conditional EXPIRE.
 */

const INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

/**
 * Check rate limit WITHOUT incrementing counter (read-only).
 * Use before validation to reject early if already over limit.
 */
async function checkUserRate(redis, action, userId, maxCount, windowSeconds) {
  const key = `rate:${action}:${userId}`;
  try {
    const count = parseInt(await redis.get(key), 10) || 0;
    if (count >= maxCount) {
      const error = new Error('操作过于频繁，请稍后再试');
      error.status = 429;
      throw error;
    }
  } catch (e) {
    if (e.status === 429) throw e;
    // Redis down — fail open
  }
}

/**
 * Increment rate counter. Call AFTER successful operation.
 */
async function incrementUserRate(redis, action, userId, windowSeconds) {
  const key = `rate:${action}:${userId}`;
  try {
    if (redis.eval) {
      await redis.eval(INCR_SCRIPT, 1, key, windowSeconds);
    } else {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
    }
  } catch (e) {
    // Redis down — ignore
  }
}

module.exports = { checkUserRate, incrementUserRate };
