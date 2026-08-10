const dotenv = require('dotenv');
const AppError = require('../utils/app-error');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://catalog_user:catalog_pass@localhost:5432/catalog_db',
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new AppError('DATABASE_URL environment variable is required in production',400);
}

module.exports = env;