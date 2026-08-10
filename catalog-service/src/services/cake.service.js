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

async function updateCake(id, updateCakeData) {
  const existing = await getCakeById(id);
  if (!existing) throw new AppError('Cake not found', 404);
  return cakeRepository.update(id, updateCakeData);
}

async function deleteCake(id) {
  const existing = await getCakeById(id);
  if (!existing) throw new AppError('Cake not found', 404);
  return cakeRepository.remove(id);
}

module.exports = {
  getCakes,
  getCakeById,
  createCake,
  updateCake,
  deleteCake,
};
