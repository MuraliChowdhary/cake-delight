const pool = require('../config/db');
const AppError = require('../utils/app-error');

function mapRowToEntity(row) {
  return {
    id: row.id,
    cakeId: row.cake_id,
    userId: row.user_id,
    score: row.score,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findAll(cakeId) {
  const query = 'SELECT * FROM ratings WHERE cake_id = $1 ORDER BY created_at DESC';
  const { rows } = await pool.query(query, [cakeId]);
  return rows.map(mapRowToEntity);
}

async function findById(id, cakeId) {
  const query = cakeId
    ? 'SELECT * FROM ratings WHERE id = $1 AND cake_id = $2'
    : 'SELECT * FROM ratings WHERE id = $1';
  const values = cakeId ? [id, cakeId] : [id];
  const { rows } = await pool.query(query, values);
  return rows.length > 0 ? mapRowToEntity(rows[0]) : null;
}

async function create(cakeId, userId, ratingData) {
  const { score, comment } = ratingData;
  const query = `
    INSERT INTO ratings (score, comment, user_id, cake_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [score, comment || null, userId, cakeId];

  try {
    const { rows } = await pool.query(query, values);
    return mapRowToEntity(rows[0]);
  } catch (error) {
    // @ts-ignore
    if (error.code === '23505') {
      throw new AppError(
        'You have already rated this cake. Update your existing rating instead.',
        409
      );
    }
    throw error;
  }
}

const ALLOWED_FIELDS = ['score', 'comment'];

async function update(id, updateData) {
  const keys = Object.keys(updateData).filter((k) => ALLOWED_FIELDS.includes(k));
  if (keys.length === 0) return findById(id);

  const setClauses = [];
  const values = [id];

  keys.forEach((key) => {
    values.push(updateData[key]);
    setClauses.push(`${key} = $${values.length}`);
  });

  const query = `
    UPDATE ratings
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);
  return rows.length > 0 ? mapRowToEntity(rows[0]) : null;
}

async function findByAverage(cakeId) {
  const query = `
    SELECT COALESCE(AVG(score), 0) AS average_score, COUNT(id) AS total_reviews 
    FROM ratings 
    WHERE cake_id = $1
  `;
  const { rows } = await pool.query(query, [cakeId]);

  return {
    cakeId,
    averageScore: parseFloat(parseFloat(rows[0].average_score).toFixed(2)),
    totalReviews: parseInt(rows[0].total_reviews, 10),
  };
}

async function remove(id) {
  const query = 'DELETE FROM ratings WHERE id = $1 RETURNING id';
  const { rows } = await pool.query(query, [id]);
  return rows.length > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  findByAverage,
  remove,
};
