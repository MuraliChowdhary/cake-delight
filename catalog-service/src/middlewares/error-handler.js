const env = require('../config/env');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  const message =
    statusCode === 500 && env.nodeEnv === 'production' ? 'Internal Server Error' : err.message;

  const logPayload = {
    err,
    requestId: req.id,
    url: req.originalUrl,
    method: req.method,
  };

  if (isOperational && statusCode < 500) {
    // Expected, handled errors — validation, not found, conflict. Normal traffic, not a failure.
    logger.warn(logPayload, 'Operational error handled');
  } else {
    // Unexpected/programmer errors, or any 5xx — needs real attention.
    logger.error(logPayload, 'Unhandled application error');
  }

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      requestId: req.id,
    },
  });
}

module.exports = errorHandler;
