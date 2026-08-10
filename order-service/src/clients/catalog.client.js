const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const env = require('../config/env');
const AppError = require('../utils/app-error');
const logger = require('../utils/logger');

const catalogClient = axios.create({
  baseURL: env.catalogServiceUrl,
  timeout: 3000,
});

axiosRetry(catalogClient, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED',
});

async function getCakeById(cakeId) {
  try {
    const { data } = await catalogClient.get(`/api/v1/cakes/${cakeId}`);
    return data.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new AppError(`Cake with ID '${cakeId}' does not exist`, 404);
    }
    logger.error({ err, cakeId }, 'Catalog service unreachable');
    throw new AppError('Catalog service is currently unavailable. Please try again shortly.', 503);
  }
}

module.exports = { getCakeById };
