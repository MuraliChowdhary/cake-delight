const redis = require('../config/redis');
const logger = require('./logger');

async function get(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.warn({ err, key }, 'Cache read failed — falling through to DB');
    return null; // treat a cache error exactly like a cache miss
  }
}

async function set(key, value, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'Cache write failed — continuing without caching this result');
  }
}

async function del(...keys) {
  try {
    if (keys.length) await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, 'Cache invalidation failed');
  }
}

async function delByPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, pattern }, 'Cache pattern invalidation failed');
  }
}

module.exports = { get, set, del, delByPattern };