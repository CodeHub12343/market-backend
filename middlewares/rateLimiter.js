const rateLimit = require('express-rate-limit');
// rate-limit-redis exports a default/class under commonjs; support both shapes
let RedisStore = require('rate-limit-redis');
RedisStore = RedisStore && (RedisStore.default || RedisStore.RedisStore || RedisStore);
const Redis = require('ioredis');
const logger = require('../utils/logger');

const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true' || false;

let redis = null;
if (!DISABLE_REDIS) {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  });

  // Make Redis errors non-fatal here; log and allow fallback to memory store
  redis.on('error', (err) => {
    logger.error('Redis Error:', err);
  });
}

// Adapter: provide a sendCommand function expected by rate-limit-redis
const sendCommand = async (...args) => {
  if (DISABLE_REDIS || !redis) {
    throw new Error('Redis is disabled or not available');
  }

  const [command, ...rest] = args;
  const cmd = String(command).toUpperCase();

  // SCRIPT LOAD <script>
  if (cmd === 'SCRIPT' && String(rest[0]).toUpperCase() === 'LOAD') {
    return redis.script('load', rest[1]);
  }

  // EVALSHA <sha> <numKeys> <key> [args...]
  if (cmd === 'EVALSHA') {
    const sha = rest[0];
    const numKeys = parseInt(rest[1], 10);
    const keysAndArgs = rest.slice(2);
    return redis.evalsha(sha, numKeys, ...keysAndArgs);
  }

  // Fallback simple commands used by the store
  if (cmd === 'DECR') {
    return redis.decr(rest[0]);
  }

  if (cmd === 'DEL') {
    return redis.del(rest[0]);
  }

  if (cmd === 'GET') {
    return redis.get(rest[0]);
  }

  if (typeof redis.sendCommand === 'function') {
    try {
      return redis.sendCommand(...args);
    } catch (e) {
      throw e;
    }
  }

  throw new Error(`Unsupported redis command in sendCommand adapter: ${command}`);
};

// (Handled only when redis is initialized above)

// Helper to attempt to create a Redis-backed store, but fall back to memory store
// If Redis is disabled, we won't create a Redis-backed store
const createRedisStoreSafe = (prefix) => {
  if (DISABLE_REDIS || !redis) {
    logger.info('DISABLE_REDIS is set; not using Redis for rate limiting.');
    return null;
  }

  try {
    const store = new RedisStore({ sendCommand, prefix });
    return store;
  } catch (err) {
    logger.warn(`Redis store unavailable for prefix=${prefix}. Falling back to in-memory store.`, err.message || err);
    return null;
  }
};

// Default rate limiter
const defaultStore = createRedisStoreSafe('rate_limit:default:');
const defaultLimiter = rateLimit(Object.assign(
  {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  // Only set store if Redis store was successfully created
  defaultStore ? { store: defaultStore } : {}
));

// Auth rate limiter (more lenient - prevents accidental overuse)
const authStore = createRedisStoreSafe('rate_limit:auth:');
const authLimiter = rateLimit(Object.assign(
  {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login attempts per 15 minutes (allows for retries and mistakes)
    message: {
      status: 'error',
      message: 'Too many login attempts from this IP, please try again in 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  authStore ? { store: authStore } : {}
));

// API rate limiter
const apiStore = createRedisStoreSafe('rate_limit:api:');
const apiLimiter = rateLimit(Object.assign(
  {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per minute
    message: {
      status: 'error',
      message: 'Too many API requests from this IP, please try again after a minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  apiStore ? { store: apiStore } : {}
));

module.exports = {
  defaultLimiter,
  authLimiter,
  apiLimiter
};