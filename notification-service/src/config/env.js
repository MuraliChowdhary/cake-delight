const dotenv = require('dotenv');
const AppError = require('../utils/app-error');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  emailHost: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  emailPort: process.env.EMAIL_PORT || 587,
  emailUser: process.env.EMAIL_USER || 'jason.green24@ethereal.email',
  emailPass: process.env.EMAIL_PASS || 'eRndjFyfcK65wD6QkU',
  emailFrom: process.env.EMAIL_FROM || 'orders@cakedelight.test',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://cakeuser:cakepass@rabbitmq:5672',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://notification_user:notification_pass@localhost:5435/notification_db',
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new AppError('DATABASE_URL environment variable is required in production', 400);
}

module.exports = env;
