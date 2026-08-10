const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://rating_user:rating_pass@rating-service:5432/rating_db',
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

module.exports = env;
