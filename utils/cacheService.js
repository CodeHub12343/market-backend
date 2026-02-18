const Redis = require('ioredis');
const logger = require('./logger');

const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true' || false;

class CacheService {
  constructor() {
    this.useRedis = !DISABLE_REDIS;
    this.memory = new Map();

    if (this.useRedis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      this.redis.on('error', (err) => {
        logger.error('Redis Error:', err);
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });
    } else {
      logger.info('DISABLE_REDIS=true -> using in-memory cache fallback');
    }
  }

  // Set cache with optional expiration
  async set(key, value, expireSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (this.useRedis) {
        if (expireSeconds) {
          await this.redis.setex(key, expireSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      } else {
        const expiresAt = expireSeconds ? Date.now() + expireSeconds * 1000 : null;
        this.memory.set(key, { value: serialized, expiresAt });
      }
      return true;
    } catch (err) {
      logger.error('Cache set error:', err);
      return false;
    }
  }

  // Get from cache
  async get(key) {
    try {
      if (this.useRedis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      }

      const entry = this.memory.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.memory.delete(key);
        return null;
      }
      return JSON.parse(entry.value);
    } catch (err) {
      logger.error('Cache get error:', err);
      return null;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (this.useRedis) {
        await this.redis.del(key);
      } else {
        this.memory.delete(key);
      }
      return true;
    } catch (err) {
      logger.error('Cache delete error:', err);
      return false;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      if (this.useRedis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } else {
        for (const key of Array.from(this.memory.keys())) {
          if (key.match(pattern.replace('*', '.*'))) this.memory.delete(key);
        }
      }
      return true;
    } catch (err) {
      logger.error('Cache clear pattern error:', err);
      return false;
    }
  }

  // Set hash field
  async hset(key, field, value) {
    try {
      const serialized = JSON.stringify(value);
      if (this.useRedis) {
        await this.redis.hset(key, field, serialized);
      } else {
        const map = this.memory.get(key) || { hash: {}, expiresAt: null };
        map.hash = map.hash || {};
        map.hash[field] = serialized;
        this.memory.set(key, map);
      }
      return true;
    } catch (err) {
      logger.error('Cache hset error:', err);
      return false;
    }
  }

  // Get hash field
  async hget(key, field) {
    try {
      if (this.useRedis) {
        const data = await this.redis.hget(key, field);
        return data ? JSON.parse(data) : null;
      }
      const map = this.memory.get(key);
      if (!map || !map.hash) return null;
      const data = map.hash[field];
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Cache hget error:', err);
      return false;
    }
  }

  // Cache middleware
  middleware(duration = 3600) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      // CRITICAL: Don't cache user-specific endpoints - they must always be fresh
      // These endpoints depend on the authenticated user and should never be cached
      if (req.originalUrl.includes('/messages') || 
          req.originalUrl.includes('/chats') ||
          req.originalUrl.includes('/auth/me') ||
          req.originalUrl.includes('/auth/profile') ||
          req.originalUrl.includes('/services') ||
          req.originalUrl.includes('/service-reviews') ||
          req.originalUrl.includes('/products') ||
          req.originalUrl.includes('/shops') ||
          req.originalUrl.includes('/hostels') ||
          req.originalUrl.includes('/hostel-reviews') ||
          req.originalUrl.includes('/roommate-listings') ||
          req.originalUrl.includes('/requests') ||
          req.originalUrl.includes('/posts') ||
          req.originalUrl.includes('/events') ||
          req.originalUrl.includes('/documents') ||
          req.originalUrl.includes('/reviews') ||
          req.originalUrl.includes('/product-categories') ||
          req.originalUrl.includes('/service-categories') ||
          req.originalUrl.includes('/event-categories') ||
          req.originalUrl.includes('/hostel-categories') ||
          req.originalUrl.includes('/roommate-categories') ||
          req.originalUrl.includes('/request-categories')) {
        console.log('🚫 Skipping cache for user-specific endpoint:', req.originalUrl);
        return next();
      }

      const key = `__express__${req.originalUrl}`;
      try {
        const cachedResponse = await this.get(key);
        if (cachedResponse) {
          return res.json(cachedResponse);
        }

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
          await this.set(key, body, duration);
          return originalJson(body);
        };

        next();
      } catch (err) {
        logger.error('Cache middleware error:', err);
        next();
      }
    };
  }
}

module.exports = new CacheService();