const amqp = require('amqplib');
const logger = require('../utils/logger');
const env = require('./env');

const EXCHANGE = 'order.events';
const QUEUE = 'notification.queue';
const ROUTING_KEY = 'order.completed';
const DEAD_LETTER_EXCHANGE = 'notification.dlx';
const DEAD_LETTER_QUEUE = 'notification.dlq';

let connection = null;
let channel = null;
let isConnecting = false;
let isClosing = false;

const RECONNECT_DELAY_MS = 5000;

function scheduleReconnect(callback) {
  setTimeout(callback, RECONNECT_DELAY_MS);
}

async function connect() {
  if (isConnecting || isClosing) return;

  isConnecting = true;

  try {
    connection = await amqp.connect(env.rabbitmqUrl);
    channel = await connection.createChannel();

    // Dead-letter path:
    // Messages that exhaust retries land here for inspection.
    // They are not lost and are not endlessly reprocessed.
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'fanout', {
      durable: true,
    });

    await channel.assertQueue(DEAD_LETTER_QUEUE, {
      durable: true,
    });

    await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, '');

    // Main exchange
    await channel.assertExchange(EXCHANGE, 'topic', {
      durable: true,
    });

    // Main notification queue
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
      },
    });

    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    // Process one message at a time.
    await channel.prefetch(1);

    connection.on('close', () => {
      logger.error('RabbitMQ connection closed. Attempting reconnect...');

      channel = null;
      connection = null;

      if (!isClosing) {
        scheduleReconnect(connect);
      }
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });

    logger.info('RabbitMQ connected, queues and exchanges ready.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ. Retrying...');

    channel = null;
    connection = null;

    if (!isClosing) {
      scheduleReconnect(connect);
    }
  } finally {
    isConnecting = false;
  }
}

function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel is not available. Connection may be down.');
  }

  return channel;
}

async function closeConnection() {
  isClosing = true;

  if (channel) {
    await channel.close();
    channel = null;
  }

  if (connection) {
    await connection.close();
    connection = null;
  }
}

module.exports = {
  connect,
  getChannel,
  closeConnection,
  EXCHANGE,
  QUEUE,
  ROUTING_KEY,
};
