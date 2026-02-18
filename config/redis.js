const Redis = require('ioredis');
const logger = require('../utils/logger');

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false
});

// Error handling
redis.on('error', (err) => {
  logger.error('Redis Error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('close', () => {
  logger.info('Redis connection closed');
});

// Helper methods with fallback for when Redis is down
const cacheGet = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error('Redis get error:', err);
    return null;
  }
};

const cacheSet = async (key, value, expirySeconds = 3600) => {
  try {
    await redis.setex(key, expirySeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.error('Redis set error:', err);
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    logger.error('Redis delete error:', err);
    return false;
  }
};

module.exports = redis;
module.exports.cacheGet = cacheGet;
module.exports.cacheSet = cacheSet;
module.exports.cacheDel = cacheDel;
