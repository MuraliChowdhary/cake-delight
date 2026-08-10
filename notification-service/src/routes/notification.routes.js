const express = require('express');
const validate = require('../middlewares/validate');
const extractUser = require('../middlewares/extract-user');
const { orderIdParamsSchema } = require('../validators/notification.schema');
const {
  getNotificationsHandler,
  getMyNotificationsHandler,
} = require('../controllers/notification.controller');

const router = express.Router();

router.get('/notifications', extractUser, getMyNotificationsHandler);
router.get('/notifications/:orderId', validate(orderIdParamsSchema), getNotificationsHandler);

module.exports = router;
