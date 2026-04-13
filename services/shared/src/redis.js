const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log('[shared/redis] Connected to Redis');
});

redis.on('error', (err) => {
  console.error('[shared/redis] Redis error:', err.message);
});

module.exports = redis;
