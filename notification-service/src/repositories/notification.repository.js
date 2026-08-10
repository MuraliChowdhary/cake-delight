const pool = require('../config/db');

function mapRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    orderId: row.order_id,
    userId: row.user_id,
    channel: row.channel,
    status: row.status,
    recipient: row.recipient,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
  };
}

async function findByEventId(eventId) {
  const { rows } = await pool.query('SELECT * FROM notifications WHERE event_id = $1', [eventId]);
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

async function findByOrderId(orderId) {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE order_id = $1 ORDER BY sent_at DESC',
    [orderId]
  );
  return rows.map(mapRow);
}

async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC',
    [userId]
  );
  return rows.map(mapRow);
}

async function record({ eventId, orderId, userId, channel, status, recipient, errorMessage }) {
  const query = `
    INSERT INTO notifications (event_id, order_id, user_id, channel, status, recipient, error_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (event_id) DO UPDATE SET
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      sent_at = NOW()
    RETURNING *
  `;
  const { rows } = await pool.query(query, [
    eventId,
    orderId,
    userId,
    channel,
    status,
    recipient,
    errorMessage || null,
  ]);
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

module.exports = { findByEventId, findByOrderId, findByUserId, record };
