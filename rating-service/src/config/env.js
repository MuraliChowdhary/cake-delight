const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL,
  databaseUrl: process.env.DATABASE_URL,
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

module.exports = env;
