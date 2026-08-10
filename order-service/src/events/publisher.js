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
      { persistent: true } // survives a RabbitMQ restart
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
    // Broker unreachable — this is the key decision: do NOT let this fail the checkout.
    // The order is already committed in the DB. Log loudly; notification will simply not fire.
    logger.error({ err, orderId: orderData.orderId }, 'Failed to publish OrderCompleted event');
  }
}

module.exports = { publishOrderCompleted };
