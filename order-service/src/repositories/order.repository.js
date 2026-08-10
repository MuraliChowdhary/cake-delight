const pool = require('../config/db');
const withTransaction = require('../utils/with-transaction');
const AppError = require('../utils/app-error');

function mapOrder(row) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    totalAmount: parseFloat(row.total_amount),
    customerEmail: row.customer_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    cakeId: row.cake_id,
    cakeName: row.cake_name,
    unitPrice: parseFloat(row.unit_price),
    quantity: row.quantity,
  };
}

async function findPendingOrder(userId) {
  const { rows } = await pool.query(
    "SELECT * FROM orders WHERE user_id = $1 AND status = 'pending'",
    [userId]
  );
  return rows.length > 0 ? mapOrder(rows[0]) : null;
}

async function findOrderById(orderId, userId) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [
    orderId,
    userId,
  ]);
  return rows.length > 0 ? mapOrder(rows[0]) : null;
}

async function getOrCreatePendingOrder(userId) {
  const existing = await findPendingOrder(userId);
  if (existing) return existing;

  const { rows } = await pool.query(
    "INSERT INTO orders (user_id, status) VALUES ($1, 'pending') RETURNING *",
    [userId]
  );
  return mapOrder(rows[0]);
}

async function findItem(orderId, cakeId) {
  const { rows } = await pool.query(
    'SELECT * FROM order_items WHERE order_id = $1 AND cake_id = $2',
    [orderId, cakeId]
  );
  return rows.length > 0 ? mapItem(rows[0]) : null;
}

async function getItems(orderId) {
  const { rows } = await pool.query(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
    [orderId]
  );
  return rows.map(mapItem);
}

async function upsertItem(orderId, { cakeId, cakeName, unitPrice, quantity }) {
  const query = `
    INSERT INTO order_items (order_id, cake_id, cake_name, unit_price, quantity)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (order_id, cake_id)
    DO UPDATE SET
      quantity = order_items.quantity + EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      updated_at = NOW()
    RETURNING *
  `;
  const { rows } = await pool.query(query, [orderId, cakeId, cakeName, unitPrice, quantity]);
  return mapItem(rows[0]);
}

async function setItemQuantity(orderId, cakeId, quantity) {
  const { rows } = await pool.query(
    `UPDATE order_items SET quantity = $3, updated_at = NOW()
     WHERE order_id = $1 AND cake_id = $2 RETURNING *`,
    [orderId, cakeId, quantity]
  );
  return rows.length > 0 ? mapItem(rows[0]) : null;
}

async function removeItem(orderId, cakeId) {
  const { rows } = await pool.query(
    'DELETE FROM order_items WHERE order_id = $1 AND cake_id = $2 RETURNING id',
    [orderId, cakeId]
  );
  return rows.length > 0;
}

async function recalculateTotal(orderId) {
  await pool.query(
    `UPDATE orders SET total_amount = (
       SELECT COALESCE(SUM(unit_price * quantity), 0) FROM order_items WHERE order_id = $1
     ), updated_at = NOW()
     WHERE id = $1`,
    [orderId]
  );
}

async function completeOrder(orderId, customerEmail) {
  return withTransaction(async (client) => {
    const { rows: itemRows } = await client.query('SELECT * FROM order_items WHERE order_id = $1', [
      orderId,
    ]);

    if (itemRows.length === 0) {
      throw new AppError('Cannot checkout an empty basket', 400);
    }

    const totalAmount = itemRows.reduce(
      (sum, item) => sum + parseFloat(item.unit_price) * item.quantity,
      0
    );

    const { rows } = await client.query(
      `UPDATE orders
       SET status = 'completed', total_amount = $2, customer_email = $3, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [orderId, totalAmount, customerEmail]
    );

    if (rows.length === 0) {
      // order was already completed/cancelled by a concurrent request
      throw new AppError('This order has already been checked out', 409);
    }

    return mapOrder(rows[0]);
  });
}

module.exports = {
  findPendingOrder,
  findOrderById,
  getOrCreatePendingOrder,
  findItem,
  getItems,
  upsertItem,
  setItemQuantity,
  removeItem,
  recalculateTotal,
  completeOrder,
};
