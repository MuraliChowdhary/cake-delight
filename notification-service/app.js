const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestLogger = require('./src/middlewares/request-logger');
const requestMiddleware = require('./src/middlewares/request-id');
const errorHandler = require('./src/middlewares/error-handler');
const healthRouter = require('./src/routes/health.routes');
const notificationRouter = require('./src/routes/notification.routes');
const env = require('./src/config/env');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.nodeEnv === 'production' ? process.env.ALLOWED_ORIGIN || false : '*',
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-request-id'],
  })
);
app.use(express.json({ limit: '10kb' }));

app.use(requestMiddleware);
app.use(requestLogger);

app.use('/health', healthRouter);
app.use('/api/v1', notificationRouter);

app.use((req, res) => {
  res.status(404).json({
    error: { message: `Route '${req.originalUrl}' not found`, status: 404, requestId: req.id },
  });
});

app.use(errorHandler);
module.exports = app;