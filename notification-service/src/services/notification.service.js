const notificationRepository = require('../repositories/notification.repository');
const emailProvider = require('../providers/email.provider');
const logger = require('../utils/logger');

async function processOrderCompletedEvent(event) {
  const existing = await notificationRepository.findByEventId(event.eventId);
  if (existing) {
    logger.info({ eventId: event.eventId }, 'Duplicate event — already processed, skipping');
    return 'duplicate';
  }

  const { orderId, userId, items, totalAmount, customerContact } = event.data;
  const recipient = customerContact.email;

  try {
    await emailProvider.sendOrderConfirmationEmail({
      to: recipient,
      orderId,
      items,
      totalAmount,
    });

    await notificationRepository.record({
      eventId: event.eventId,
      orderId,
      userId,
      channel: 'email',
      status: 'sent',
      recipient,
      errorMessage: 'Message',
    });
  } catch (err) {
    await notificationRepository.record({
      eventId: event.eventId,
      orderId,
      userId,
      channel: 'email',
      status: 'failed',
      recipient,
      errorMessage: err.message,
    });
    throw err;
  }

  return 'processed';
}

async function getNotificationsForOrder(orderId) {
  return notificationRepository.findByOrderId(orderId);
}

async function getNotificationsForUser(userId) {
  return notificationRepository.findByUserId(userId);
}

module.exports = {
  processOrderCompletedEvent,
  getNotificationsForOrder,
  getNotificationsForUser,
};
