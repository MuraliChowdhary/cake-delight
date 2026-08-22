const Redis = require('ioredis');
const logger = require('../utils/logger');
const env = require('./env');

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

redis.on('connect', () => logger.info('Redis connected.'));
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));

module.exports = redis;
