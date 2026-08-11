// api.js — single point of contact with the backend. Every request goes through
// the API Gateway (port 5000) only — never a service port directly.

const GATEWAY_URL = 'http://localhost:5000';

function getUserId() {
  let userId = localStorage.getItem('cakeDelightUserId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('cakeDelightUserId', userId);
  }
  return userId;
}

async function request(path, options = {}) {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(),
      ...(options.headers || {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

export const api = {
  getUserId,

  // Catalog
  getCakes(filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== '' && value != null)
    );
    const query = params.toString() ? `?${params}` : '';
    return request(`/api/v1/cakes${query}`);
  },
  getCake(cakeId) {
    return request(`/api/v1/cakes/${cakeId}`);
  },

  // Ratings
  getRatings(cakeId) {
    return request(`/api/v1/cakes/${cakeId}/ratings`);
  },
  getAverageRating(cakeId) {
    return request(`/api/v1/cakes/${cakeId}/ratings/average`);
  },
  submitRating(cakeId, { score, comment }) {
    return request(`/api/v1/cakes/${cakeId}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ score, comment: comment || undefined }),
    });
  },

  // Basket / Order
  getBasket() {
    return request('/api/v1/basket');
  },
  addToBasket(cakeId, quantity = 1) {
    return request('/api/v1/basket/items', {
      method: 'POST',
      body: JSON.stringify({ cakeId, quantity }),
    });
  },
  updateBasketItem(cakeId, quantity) {
    return request(`/api/v1/basket/items/${cakeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },
  removeBasketItem(cakeId) {
    return request(`/api/v1/basket/items/${cakeId}`, { method: 'DELETE' });
  },
  checkout(customerEmail) {
    return request('/api/v1/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({ customerEmail }),
    });
  },
};