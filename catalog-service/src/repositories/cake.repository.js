const pool = require('../config/db');

function mapRowToEntity(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: parseFloat(row.price),
    isAvailable: row.is_available,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

  if (filters.minPrice !== undefined) {
    values.push(filters.minPrice);
    query += ` AND price >= $${values.length}`;
  }

  if (filters.maxPrice !== undefined) {
    values.push(filters.maxPrice);
    query += ` AND price <= $${values.length}`;
  }

  query += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(query, values);
  return rows.map(mapRowToEntity);
}

async function findById(id) {
  const query = 'SELECT * FROM cakes WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows.length > 0 ? mapRowToEntity(rows[0]) : null;
}

async function create(cakeData) {
  const { name, description, price, category, imageUrl } = cakeData;
  const query = `
    INSERT INTO cakes (name, description, price, category, image_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [name, description || null, price, category, imageUrl || null];
  const { rows } = await pool.query(query, values);
  return mapRowToEntity(rows[0]);
}

const ALLOWED_FIELDS = ['name', 'description', 'category', 'price', 'is_available', 'image_url'];
const FIELD_MAP = { imageUrl: 'image_url', isAvailable: 'is_available' };

async function update(id, cakeData) {
  const keys = Object.keys(cakeData);
  const setClauses = [];
  const values = [id];

  keys.forEach((key) => {
    const dbColumn = FIELD_MAP[key] || key;
    if (!ALLOWED_FIELDS.includes(dbColumn)) return;
    values.push(cakeData[key]);
    setClauses.push(`${dbColumn} = $${values.length}`);
  });

  if (setClauses.length === 0) return findById(id);

  const query = `
    UPDATE cakes
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);
  return rows.length > 0 ? mapRowToEntity(rows[0]) : null;
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
