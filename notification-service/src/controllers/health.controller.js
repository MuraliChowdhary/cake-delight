const pool = require('../config/db');
const { getChannel } = require('../config/rabbitmq');

async function getReadiness(req, res) {
  try {
    await pool.query('SELECT 1');
    getChannel(); // throws if not connected
    res.status(200).json({ status: 'READY', database: 'CONNECTED' });
  } catch (err) {
    res.status(503).json({ status: 'NOT_READY', database: 'DISCONNECTED', err });
  }
}

function getLiveness(req, res) {
  res.status(200).json({ status: 'UP', service: 'catalog-service' });
}

module.exports = { getReadiness, getLiveness };
