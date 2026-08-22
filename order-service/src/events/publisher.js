const { randomUUID } = require('crypto');
const { getChannel } = require('../config/rabbitmq');
const logger = require('../utils/logger');

async function publishOrderCompleted(orderData) {
  const event = {
    eventId: randomUUID(),
    eventType: 'OrderCompleted',
    occurredAt: new Date().toISOString(),
    data: orderData,
  };

  try {
    const channel = getChannel();
    const published = channel.publish(
      'order.events',
      'order.completed',
      Buffer.from(JSON.stringify(event)),
      { persistent: true } 
    );

    if (!published) {
      logger.warn({ eventId: event.eventId }, 'Publish returned false — broker buffer full');
    } else {
      logger.info(
        { eventId: event.eventId, orderId: orderData.orderId },
        'OrderCompleted published'
      );
    }
  } catch (err) {
    logger.error({ err, orderId: orderData.orderId }, 'Failed to publish OrderCompleted event');
  }
}

module.exports = { publishOrderCompleted };
