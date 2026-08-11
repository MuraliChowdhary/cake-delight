// main.js — app entry point. Wires modules together and owns the shared toast utility.

import { api } from './api.js';
import { initCatalog, loadCakes } from './catalog.js';
import { initBasket, closeDrawer } from './basket.js';
import { initRatingModal } from './rating.js';

const toastStack = document.getElementById('toast-stack');

export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

window.addEventListener('drawer:close', closeDrawer);

// Re-fetch the grid whenever a category chip changes (dispatched from catalog.js itself,
// kept here only as the single place that owns "what happens when data changes").
window.addEventListener('catalog:refresh', loadCakes);

function initUserBadge() {
  const userId = api.getUserId();
  const badgeIdEl = document.getElementById('user-badge-id');
  badgeIdEl.textContent = userId.split('-')[0]; // short form for display

  document.getElementById('user-badge').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(userId);
      showToast('Guest ID copied — this is your X-User-Id for the whole session');
    } catch {
      showToast(userId); // clipboard API unavailable — surface the full ID directly
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initUserBadge();
  initCatalog();
  initBasket();
  initRatingModal();
});