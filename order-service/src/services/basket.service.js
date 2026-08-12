const orderRepository = require('../repositories/order.repository');
const catalogClient = require('../clients/catalog.client');
const AppError = require('../utils/app-error');

async function getBasket(userId) {
  const order = await orderRepository.findPendingOrder(userId);
  if (!order) {
    return { orderId: null, items: [], totalAmount: 0 };
  }
  const items = await orderRepository.getItems(order.id);
  return { orderId: order.id, items, totalAmount: order.totalAmount };
}

async function addItem(userId, { cakeId, quantity }) {
  const cake = await catalogClient.getCakeById(cakeId);

  if (cake.isAvailable === false) {
    throw new AppError(`'${cake.name}' is currently unavailable`, 400);
  }

  const order = await orderRepository.getOrCreatePendingOrder(userId);

  await orderRepository.upsertItem(order.id, {
    cakeId: cake.id,
    cakeName: cake.name,
    unitPrice: cake.price,
    quantity,
  });

  await orderRepository.recalculateTotal(order.id);

  return getBasket(userId);
}

async function updateItemQuantity(userId, cakeId, quantity) {
  const order = await orderRepository.findPendingOrder(userId);
  if (!order) {
    throw new AppError('Basket is empty', 404);
  }

  const existingItem = await orderRepository.findItem(order.id, cakeId);
  if (!existingItem) {
    throw new AppError('Item not found in basket', 404);
  }

  await orderRepository.setItemQuantity(order.id, cakeId, quantity);
  await orderRepository.recalculateTotal(order.id);

  return getBasket(userId);
}

async function removeItem(userId, cakeId) {
  const order = await orderRepository.findPendingOrder(userId);
  if (!order) {
    throw new AppError('Basket is empty', 404);
  }

  const removed = await orderRepository.removeItem(order.id, cakeId);
  if (!removed) {
    throw new AppError('Item not found in basket', 404);
  }

  await orderRepository.recalculateTotal(order.id);

  return getBasket(userId);
}

async function getCompletedItems(userId) {
  const orders = await orderRepository.getCompletedItems(userId);
  if (!orders) {
    throw new AppError('You have not purchased any items yet', 404);
  }
  return orders;
}
module.exports = {
  getBasket,
  addItem,
  updateItemQuantity,
  removeItem,
  getCompletedItems,
};
