const amqp = require('amqplib');
const logger = require('../utils/logger');
const env = require('./env');

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

    await channel.assertExchange('order.events', 'topic', {
      durable: true,
    });

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

    logger.info('RabbitMQ connected and channel established.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ. Retrying...');

    connection = null;
    channel = null;

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
};
