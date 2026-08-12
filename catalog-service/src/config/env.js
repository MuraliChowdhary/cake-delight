const dotenv = require('dotenv');
const AppError = require('../utils/app-error');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL,
  databaseUrl: process.env.DATABASE_URL,
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new AppError('DATABASE_URL environment variable is required in production', 400);
}

module.exports = env;
