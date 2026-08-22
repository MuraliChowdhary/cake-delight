const { getChannel, QUEUE } = require('../config/rabbitmq');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

const MAX_RETRIES = 3;

function getRetryCount(msg) {
  return (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
}

async function handleMessage(channel, msg) {
  let event;

  try {
    event = JSON.parse(msg.content.toString());
  } catch (err) {
    logger.error({ err }, 'Received unparseable message — sending to dead-letter queue');
    channel.nack(msg, false, false);
    return;
  }

  try {
    await notificationService.processOrderCompletedEvent(event);
    channel.ack(msg);
  } catch (err) {
    const retryCount = getRetryCount(msg);
    logger.error(
      { err, eventId: event.eventId, retryCount },
      'Failed to process OrderCompleted event'
    );

    if (retryCount < MAX_RETRIES) {
      channel.publish('order.events', 'order.completed', msg.content, {
        persistent: true,
        headers: { 'x-retry-count': retryCount + 1 },
      });
      channel.ack(msg);
    } else {
      logger.error(
        { eventId: event.eventId },
        `Exceeded ${MAX_RETRIES} retries — routing to dead-letter queue`
      );
      channel.nack(msg, false, false);
    }
  }
}

function startConsuming() {
  const channel = getChannel();
  channel.consume(QUEUE, (msg) => {
    if (msg !== null) handleMessage(channel, msg);
  });
  logger.info('Notification Service is consuming from RabbitMQ.');
}

module.exports = { startConsuming };
