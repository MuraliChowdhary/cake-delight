const pool = require('../config/db');

async function findAll(filters) {
  let query = 'SELECT * FROM cakes WHERE 1=1';
  const values = [];

  if (filters.category) {
    values.push(filters.category);
    query += ` AND category = $${values.length}`;
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    query += ` AND name ILIKE $${values.length}`;
  }

  if (filters.minPrice) {
    values.push(filters.minPrice);
    query += ` AND price >= $${values.length}`;
  }

  if (filters.maxPrice) {
    values.push(filters.maxPrice);
    query += ` AND price <= $${values.length}`;
  }

  query += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(query, values);
  return rows;
}

async function findById(id) {
  const query = 'SELECT * FROM cakes WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function create(cakeData) {
  const { name, description, price, category, stock, imageUrl } = cakeData;
  const query = `
    INSERT INTO cakes (name, description, price, category, stock, image_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [name, description || null, price, category, stock || 0, imageUrl || null];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function update(id, cakeData) {
  const keys = Object.keys(cakeData);
  if (keys.length === 0) return findById(id);

  const setClauses = [];
  const values = [id];

  keys.forEach((key) => {
    const dbColumn = key === 'imageUrl' ? 'image_url' : key;
    values.push(cakeData[key]);
    setClauses.push(`${dbColumn} = $${values.length}`);
  });

  const query = `
    UPDATE cakes
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function remove(id) {
  const query = 'DELETE FROM cakes WHERE id = $1 RETURNING id';
  const { rows } = await pool.query(query, [id]);
  return rows.length > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
