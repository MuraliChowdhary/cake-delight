const basketService = require('../services/basket.service');

async function getBasketHandler(req, res, next) {
  try {
    const basket = await basketService.getBasket(req.userId);
    res.status(200).json({ status: 'success', data: basket });
  } catch (error) {
    next(error);
  }
}

async function addItemHandler(req, res, next) {
  try {
    const basket = await basketService.addItem(req.userId, req.body);
    res.status(201).json({ status: 'success', data: basket });
  } catch (error) {
    next(error);
  }
}

async function updateItemHandler(req, res, next) {
  try {
    const basket = await basketService.updateItemQuantity(
      req.userId,
      req.params.cakeId,
      req.body.quantity
    );
    res.status(200).json({ status: 'success', data: basket });
  } catch (error) {
    next(error);
  }
}

async function removeItemHandler(req, res, next) {
  try {
    const basket = await basketService.removeItem(req.userId, req.params.cakeId);
    res.status(200).json({ status: 'success', data: basket });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBasketHandler,
  addItemHandler,
  updateItemHandler,
  removeItemHandler,
};
