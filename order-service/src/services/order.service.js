const orderRepository = require('../repositories/order.repository');
const { publishOrderCompleted } = require('../events/publisher');
const AppError = require('../utils/app-error');
const catalogClient = require('../clients/catalog.client');

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

async function revalidateStaleItems(orderId, items) {
  const now = Date.now();

  const priceChangePromises = items
    .filter((item) => {
      const ageMs = now - new Date(item.updatedAt).getTime();
      return ageMs > STALE_THRESHOLD_MS;
    })
    .map(async (item) => {
      const currentCake = await catalogClient.getCakeById(item.cakeId);

      const basketPrice = Number(item.unitPrice);
      const catalogPrice = Number(currentCake.price);

      if (catalogPrice !== basketPrice) {
        return {
          cakeId: item.cakeId,
          name: item.cakeName,
          oldPrice: basketPrice,
          newPrice: catalogPrice,
        };
      }

      return null;
    });

  const priceChangesWithNulls = await Promise.all(priceChangePromises);

  const priceChanges = priceChangesWithNulls.filter(Boolean);
  return priceChanges;
}

async function checkout(userId, { customerEmail }) {
  const order = await orderRepository.findPendingOrder(userId);
  if (!order) {
    throw new AppError('Basket is empty', 400);
  }

  const items = await orderRepository.getItems(order.id);

  if (items.length === 0) {
    throw new AppError('Cannot checkout an empty basket', 400);
  }

  const priceChanges = await revalidateStaleItems(order.id, items);

  if (priceChanges.length > 0) {
    await orderRepository.recalculateTotal(order.id);
    throw new AppError(
      'Some prices changed since you added these items. Please review before checking out.',
      409,
      { priceChanges }
    );
  }
  const completedOrder = await orderRepository.completeOrder(order.id, customerEmail);

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
