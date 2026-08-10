const notificationService = require('../services/notification.service');

async function getNotificationsHandler(req, res, next) {
  try {
    const notifications = await notificationService.getNotificationsForOrder(req.params.orderId);
    res.status(200).json({ status: 'success', data: notifications });
  } catch (error) {
    next(error);
  }
}

async function getMyNotificationsHandler(req, res, next) {
  try {
    const notifications = await notificationService.getNotificationsForUser(req.userId);
    res.status(200).json({
      status: 'success',
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNotificationsHandler, getMyNotificationsHandler };
