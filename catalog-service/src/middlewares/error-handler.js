const env = require('../config/env');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && env.nodeEnv === 'production' ? 'Internal Server Error' : err.message;

  logger.error(
    {
      err,
      requestId: req.id,
      url: req.originalUrl,
      method: req.method,
    },
    'Unhandled Application Error'
  );

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      requestId: req.id,
    },
  });
}

module.exports = errorHandler;
