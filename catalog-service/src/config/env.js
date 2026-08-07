const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://catalog_user:catalog_pass@localhost:5432/catalog_db',
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

module.exports = env;
