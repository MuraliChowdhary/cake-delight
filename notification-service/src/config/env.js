const dotenv = require('dotenv');
const AppError = require('../utils/app-error');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailFrom: process.env.EMAIL_FROM,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  databaseUrl: process.env.DATABASE_URL,
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new AppError('DATABASE_URL environment variable is required in production', 400);
}

module.exports = env;
