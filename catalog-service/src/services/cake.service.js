const cakeRepository = require('../repositories/cake.repository');
const AppError = require('../utils/app-error');

async function getCakes(filters) {
  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new AppError('minPrice must be less than or equal to maxPrice.', 400);
  }
  return cakeRepository.findAll(filters);
}

async function getCakeById(id) {
  return cakeRepository.findById(id);
}

async function createCake(cakeData) {
  return cakeRepository.create(cakeData);
}

async function updateCake(id, updatecakeData) {
  await getCakeById(id);
  return cakeRepository.update(id, updatecakeData);
}

async function deleteCake(id) {
  return cakeRepository.remove(id);
}

module.exports = {
  getCakes,
  getCakeById,
  createCake,
  updateCake,
  deleteCake,
};
