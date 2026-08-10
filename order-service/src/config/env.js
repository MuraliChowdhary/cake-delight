const dotenv = require('dotenv');
const AppError = require('../utils/app-error');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '5002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:5001',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://cakeuser:cakepass@rabbitmq:5672',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://order_user:order_pass@localhost:5434/order_db',
};

if (!process.env.DATABASE_URL && env.nodeEnv === 'production') {
  throw new AppError('DATABASE_URL environment variable is required in production', 400);
}

module.exports = env;
