const orderService = require('../services/order.service');

async function checkoutHandler(req, res, next) {
  try {
    const order = await orderService.checkout(req.userId, req.body);
    res.status(201).json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
}

async function getOrderHandler(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.userId, req.params.id);
    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkoutHandler,
  getOrderHandler,
};
