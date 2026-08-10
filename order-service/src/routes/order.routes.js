const express = require('express');
const validate = require('../middlewares/validate');
const extractUser = require('../middlewares/extract-user');
const {
  addItemSchema,
  updateItemSchema,
  removeItemSchema,
} = require('../validators/basket-item.schema');
const { checkoutSchema, orderIdParamsSchema } = require('../validators/checkout.schema');

const {
  getBasketHandler,
  addItemHandler,
  updateItemHandler,
  removeItemHandler,
} = require('../controllers/basket.controller');

const { checkoutHandler, getOrderHandler } = require('../controllers/order.controller');

const router = express.Router();

router.get('/basket', extractUser, getBasketHandler);
router.post('/basket/items', extractUser, validate(addItemSchema), addItemHandler);
router.patch('/basket/items/:cakeId', extractUser, validate(updateItemSchema), updateItemHandler);
router.delete('/basket/items/:cakeId', extractUser, validate(removeItemSchema), removeItemHandler);

router.post('/orders/checkout', extractUser, validate(checkoutSchema), checkoutHandler);
router.get('/orders/:id', extractUser, validate(orderIdParamsSchema), getOrderHandler);

module.exports = router;
