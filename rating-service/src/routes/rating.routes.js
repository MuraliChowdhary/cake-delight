const express = require('express');
const validate = require('../middlewares/validate');
const extractUser = require('../middlewares/extract-user');
const {
  createRatingSchema,
  updateRatingSchema,
  cakeIdSchema,
  ratingIdParamsSchema,
} = require('../validators/rating.schema');

const {
  createRatingHandler,
  getAllRatingsHandler,
  getAverageRatingsHandler,
  updateRatingHandler,
  deleteRatingHandler,
} = require('../controllers/rating.controller');

const router = express.Router();

router.get('/cakes/:cakeId/ratings', validate(cakeIdSchema), getAllRatingsHandler);
router.post(
  '/cakes/:cakeId/ratings',
  extractUser,
  validate(createRatingSchema),
  createRatingHandler
);

router.get('/cakes/:cakeId/ratings/average', validate(cakeIdSchema), getAverageRatingsHandler);

router.put(
  '/cakes/:cakeId/ratings/:ratingId',
  extractUser,
  validate(updateRatingSchema),
  updateRatingHandler
);
router.delete(
  '/cakes/:cakeId/ratings/:ratingId',
  extractUser,
  validate(ratingIdParamsSchema),
  deleteRatingHandler
);

module.exports = router;
