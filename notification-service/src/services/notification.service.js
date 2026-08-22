const notificationRepository = require('../repositories/notification.repository');
const emailProvider = require('../providers/email.provider');
const withTimeout = require('../utils/with-timeout');
const logger = require('../utils/logger');

const EMAIL_TIMEOUT_MS = 10000;

async function processOrderCompletedEvent(event) {
  const existing = await notificationRepository.findByEventId(event.eventId);
  if (existing) {
    logger.info({ eventId: event.eventId }, 'Duplicate event — already processed, skipping');
    return 'duplicate';
  }

  const { orderId, userId, items, totalAmount, customerContact } = event.data;
  const recipient = customerContact.email;

  await notificationRepository.record({
    eventId: event.eventId,
    orderId,
    userId,
    channel: 'email',
    status: 'pending',
    recipient,
    errorMessage: 'NA',
  });

  try {
    await withTimeout(
      emailProvider.sendOrderConfirmationEmail({ to: recipient, orderId, items, totalAmount }),
      EMAIL_TIMEOUT_MS,
      'Email send'
    );

    await notificationRepository.record({
      eventId: event.eventId,
      orderId,
      userId,
      channel: 'email',
      status: 'sent',
      recipient,
      errorMessage: 'NA',
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
