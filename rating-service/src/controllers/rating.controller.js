const ratingService = require('../services/rating.service');

async function createRatingHandler(req, res, next) {
  try {
    const rating = await ratingService.createRating(req.params.cakeId, req.userId, req.body);
    res.status(201).json({ status: 'success', data: rating });
  } catch (error) {
    next(error);
  }
}

async function getAllRatingsHandler(req, res, next) {
  try {
    const ratings = await ratingService.getAllRatings(req.params.cakeId);
    res.status(200).json({
      status: 'success',
      data: ratings,
      count: ratings.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getAverageRatingsHandler(req, res, next) {
  try {
    const averageData = await ratingService.getAverageRatings(req.params.cakeId);
    res.status(200).json({ status: 'success', data: averageData });
  } catch (error) {
    next(error);
  }
}

async function updateRatingHandler(req, res, next) {
  try {
    const updatedRating = await ratingService.updateRating(
      req.params.ratingId,
      req.params.cakeId,
      req.userId,
      req.body
    );
    res.status(200).json({ status: 'success', data: updatedRating });
  } catch (error) {
    next(error);
  }
}

async function deleteRatingHandler(req, res, next) {
  try {
    await ratingService.deleteRating(req.params.ratingId, req.params.cakeId, req.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRatingHandler,
  getAllRatingsHandler,
  getAverageRatingsHandler,
  updateRatingHandler,
  deleteRatingHandler,
};
