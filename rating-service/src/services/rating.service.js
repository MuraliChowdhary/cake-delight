const ratingRepository = require('../repositories/rating.repository');
const AppError = require('../utils/app-error');
const cache = require("../utils/cache");

const AVERAGE_TTL = 60;

async function getAllRatings(cakeId) {
  return ratingRepository.findAll(cakeId);
}

async function getAverageRatings(cakeId) {
  const key = `rating:average:${cakeId}`;
  const cached = await cache.get(key);
  if (cached) return cached;

  const average = await ratingRepository.findByAverage(cakeId);
  await cache.set(key, average, AVERAGE_TTL);
  return average;
}

async function createRating(cakeId, userId, ratingData) {
  const rating = await ratingRepository.create(cakeId, userId, ratingData);
  await cache.del(`rating:average:${cakeId}`);
  return rating;
}

async function updateRating(ratingId, cakeId, userId, updateRatingData) {
  const existingRating = await ratingRepository.findById(ratingId, cakeId);
  if (!existingRating) throw new AppError(`Rating with ID '${ratingId}' not found for this cake`, 404);
  if (existingRating.userId !== userId) throw new AppError('You can only update your own rating', 403);

  const updated = await ratingRepository.update(ratingId, updateRatingData);
  await cache.del(`rating:average:${cakeId}`);
  return updated;
}

async function deleteRating(ratingId, cakeId, userId) {
  const existingRating = await ratingRepository.findById(ratingId, cakeId);
  if (!existingRating) throw new AppError(`Rating with ID '${ratingId}' not found for this cake`, 404);
  if (existingRating.userId !== userId) throw new AppError('You can only delete your own rating', 403);

  const result = await ratingRepository.remove(ratingId);
  await cache.del(`rating:average:${cakeId}`);
  return result;
}

module.exports = {
  getAllRatings,
  getAverageRatings,
  createRating,
  updateRating,
  deleteRating,
};