const express = require('express');
const {
  getAllCakesHandler,
  createCakeHandler,
  getCakeByIdHandler,
  updateCakeHandler,
  deleteCakeHandler,
} = require('../controllers/cake.controller');
const validate = require('../middlewares/validate');
const {
  getCakesQuerySchema,
  CakeIdSchema,
  createCakeSchema,
  updateCakeSchema,
} = require('../validators/cake.schema');

const router = express.Router();

router.get('/cakes', validate(getCakesQuerySchema), getAllCakesHandler);
router.post('/cakes', validate(createCakeSchema), createCakeHandler);
router.get('/cakes/:id', validate(CakeIdSchema), getCakeByIdHandler);
router.put('/cakes/:id', validate(updateCakeSchema), updateCakeHandler);
router.delete('/cakes/:id', validate(CakeIdSchema), deleteCakeHandler);

module.exports = router;
