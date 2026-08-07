const pool = require('../config/db');

function getLiveness(req, res) {
  res.status(200).json({ status: 'UP', service: 'catalog-service' });
}

async function getReadiness(req, res) {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'READY', database: 'CONNECTED' });
  } catch (err) {
    res.status(503).json({ status: 'NOT_READY', database: 'DISCONNECTED' });
  }
}

module.exports = {
  getLiveness,
  getReadiness,
};
