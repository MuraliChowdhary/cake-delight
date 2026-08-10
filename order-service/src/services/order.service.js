const orderRepository = require('../repositories/order.repository');
const { publishOrderCompleted } = require('../events/publisher');
const AppError = require('../utils/app-error');

async function checkout(userId, { customerEmail }) {
  const order = await orderRepository.findPendingOrder(userId);
  if (!order) {
    throw new AppError('Basket is empty', 400);
  }

  const items = await orderRepository.getItems(order.id);

  const completedOrder = await orderRepository.completeOrder(order.id, customerEmail);

  // Fire-and-forget by design — a broker outage should not roll back a completed order.
  // See publisher.js for the reasoning.
  await publishOrderCompleted({
    orderId: completedOrder.id,
    userId,
    items: items.map((item) => ({
      cakeId: item.cakeId,
      name: item.cakeName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    totalAmount: completedOrder.totalAmount,
    customerContact: { email: customerEmail },
  });

  return completedOrder;
}

async function getOrderById(userId, orderId) {
  const order = await orderRepository.findOrderById(orderId, userId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  const items = await orderRepository.getItems(order.id);
  return { ...order, items };
}

module.exports = {
  checkout,
  getOrderById,
};
