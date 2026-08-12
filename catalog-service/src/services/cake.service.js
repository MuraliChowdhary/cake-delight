const cakeRepository = require('../repositories/cake.repository');
const AppError = require('../utils/app-error');
const cache = require('../utils/cache');

const LIST_TTL = 60; // seconds — lists change more often, shorter TTL
const DETAIL_TTL = 300; // seconds — single-cake detail is more stable

function listCacheKey(filters) {
  // deterministic key regardless of key order in the filters object
  const sorted = Object.keys(filters)
    .sort()
    .map((k) => `${k}=${filters[k] ?? ''}`)
    .join('&');
  return `catalog:list:${sorted}`;
}

async function getCakes(filters) {
  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new AppError('minPrice must be less than or equal to maxPrice.', 400);
  }

  const key = listCacheKey(filters);
  const cached = await cache.get(key);
  if (cached) return cached;

  const cakes = await cakeRepository.findAll(filters);
  await cache.set(key, cakes, LIST_TTL);
  return cakes;
}

async function getCakeById(id) {
  const key = `catalog:cake:${id}`;
  const cached = await cache.get(key);
  if (cached) return cached;

  const cake = await cakeRepository.findById(id);
  if (cake) await cache.set(key, cake, DETAIL_TTL);
  return cake;
}

async function createCake(cakeData) {
  const cake = await cakeRepository.create(cakeData);
  await cache.delByPattern('catalog:list:*'); // a new cake can appear in any list combination
  return cake;
}

async function updateCake(id, updateCakeData) {
  const existing = await getCakeById(id);
  if (!existing) throw new AppError('Cake not found', 404);

  const updated = await cakeRepository.update(id, updateCakeData);
  await cache.del(`catalog:cake:${id}`);
  await cache.delByPattern('catalog:list:*'); // price/category/availability changes affect filters
  return updated;
}

async function deleteCake(id) {
  const result = await cakeRepository.remove(id);
  await cache.del(`catalog:cake:${id}`);
  await cache.delByPattern('catalog:list:*');
  return result;
}

module.exports = {
  getCakes,
  getCakeById,
  createCake,
  updateCake,
  deleteCake,
};
