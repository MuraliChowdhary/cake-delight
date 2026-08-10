const ratingRepository = require('../repositories/rating.repository');
const AppError = require('../utils/app-error');

async function getAllRatings(cakeId) {
  return ratingRepository.findAll(cakeId);
}

async function getAverageRatings(cakeId) {
  return ratingRepository.findByAverage(cakeId);
}

async function createRating(cakeId, userId, ratingData) {
  return ratingRepository.create(cakeId, userId, ratingData);
}

async function updateRating(ratingId, cakeId, userId, updateRatingData) {
  const existingRating = await ratingRepository.findById(ratingId, cakeId);
  if (!existingRating) {
    throw new AppError(`Rating with ID '${ratingId}' not found for this cake`, 404);
  }
  if (existingRating.userId !== userId) {
    throw new AppError('You can only update your own rating', 403);
  }
  return ratingRepository.update(ratingId, updateRatingData);
}

async function deleteRating(ratingId, cakeId, userId) {
  const existingRating = await ratingRepository.findById(ratingId, cakeId);
  if (!existingRating) {
    throw new AppError(`Rating with ID '${ratingId}' not found for this cake`, 404);
  }
  if (existingRating.userId !== userId) {
    throw new AppError('You can only delete your own rating', 403);
  }
  return ratingRepository.remove(ratingId);
}

module.exports = {
  getAllRatings,
  getAverageRatings,
  createRating,
  updateRating,
  deleteRating,
};
