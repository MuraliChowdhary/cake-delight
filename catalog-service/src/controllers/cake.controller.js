const cakeService = require('../services/cake.service');
const AppError = require('../utils/app-error');

async function getAllCakesHandler(req, res, next) {
  try {
    const cakes = await cakeService.getCakes(req.query);
    res.json({
      status: 'success',
      data: cakes,
      count: cakes.length,
    });
  } catch (err) {
    next(err);
  }
}

async function getCakeByIdHandler(req, res, next) {
  try {
    const cake = await cakeService.getCakeById(req.params.id);

    if (cake === null) {
      throw new AppError('Cake Id not found', 404);
    }
    res.json({ status: 'success', data: cake });
  } catch (err) {
    next(err);
  }
}

async function createCakeHandler(req, res, next) {
  try {
    const newCake = await cakeService.createCake(req.body);
    res.status(201).json({ status: 'success', data: newCake });
  } catch (error) {
    next(error);
  }
}

async function updateCakeHandler(req, res, next) {
  try {
    const updatedCake = await cakeService.updateCake(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: updatedCake });
  } catch (error) {
    next(error);
  }
}

async function deleteCakeHandler(req, res, next) {
  try {
    await cakeService.deleteCake(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
module.exports = {
  getAllCakesHandler,
  getCakeByIdHandler,
  createCakeHandler,
  updateCakeHandler,
  deleteCakeHandler,
};
