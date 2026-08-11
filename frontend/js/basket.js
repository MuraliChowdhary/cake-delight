// catalog.js — renders the cake grid, wires filters, and opens cake detail.

import { api } from './api.js';
import { showToast } from './main.js';
import { openCakeModal } from './rating.js';

const grid = document.getElementById('cake-grid');
const emptyState = document.getElementById('catalog-empty');
const errorState = document.getElementById('catalog-error');
const searchInput = document.getElementById('search-input');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const chipRow = document.getElementById('category-chips');

let allCakes = [];
let activeCategory = '';
let debounceTimer = null;

// A cake's category deterministically picks one of three accent hues —
// gives each card a "flavor swatch" without needing real photography.
const SWATCHES = ['var(--butter)', 'var(--berry)', 'var(--mauve)'];
function swatchFor(category) {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash + category.charCodeAt(i)) % SWATCHES.length;
  return SWATCHES[hash];
}

function renderChips(categories) {
  chipRow.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = `chip ${activeCategory === '' ? 'chip--active' : ''}`;
  allChip.textContent = 'All';
  allChip.dataset.category = '';
  chipRow.appendChild(allChip);

  categories.forEach((category) => {
    const chip = document.createElement('button');
    chip.className = `chip ${activeCategory === category ? 'chip--active' : ''}`;
    chip.textContent = category;
    chip.dataset.category = category;
    chipRow.appendChild(chip);
  });

  chipRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.category;
      loadCakes();
    });
  });
}

function renderCakes(cakes) {
  grid.innerHTML = '';
  emptyState.hidden = cakes.length > 0;

  cakes.forEach((cake) => {
    const card = document.createElement('article');
    card.className = 'cake-card';
    card.style.setProperty('--swatch', swatchFor(cake.category));

    card.innerHTML = `
      <div class="cake-card__image">CD</div>
      <div class="cake-card__body">
        <p class="cake-card__category">${cake.category}</p>
        <h3 class="cake-card__name">${cake.name}</h3>
        <p class="cake-card__desc">${cake.description || ''}</p>
        <div class="cake-card__footer">
          <span class="cake-card__price">$${cake.price.toFixed(2)}</span>
          ${
            cake.isAvailable
              ? `<button class="btn btn--primary" data-add="${cake.id}">Add</button>`
              : `<span class="cake-card__unavailable">Sold out</span>`
          }
        </div>
      </div>
    `;

    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-add]')) return; // handled separately below
      openCakeModal(cake);
    });

    const addBtn = card.querySelector('[data-add]');
    if (addBtn) {
      addBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        addBtn.disabled = true;
        try {
          await api.addToBasket(cake.id, 1);
          showToast(`${cake.name} added to basket`);
          window.dispatchEvent(new CustomEvent('basket:changed'));
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          addBtn.disabled = false;
        }
      });
    }

    grid.appendChild(card);
  });
}

export async function loadCakes() {
  const filters = {
    search: searchInput.value.trim(),
    category: activeCategory,
    minPrice: minPriceInput.value,
    maxPrice: maxPriceInput.value,
  };

  try {
    const { data } = await api.getCakes(filters);
    allCakes = allCakes.length ? allCakes : data; // keep original unfiltered set for category chips
    errorState.hidden = true;
    renderCakes(data);
  } catch (err) {
    errorState.hidden = false;
    grid.innerHTML = '';
    showToast(err.message, 'error');
  }
}

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
}

export async function initCatalog() {
  try {
    const { data } = await api.getCakes();
    allCakes = data;
    const categories = [...new Set(data.map((cake) => cake.category))].sort();
    renderChips(categories);
    renderCakes(data);
  } catch (err) {
    errorState.hidden = false;
    showToast(err.message, 'error');
  }

  searchInput.addEventListener('input', debounce(loadCakes, 350));
  minPriceInput.addEventListener('input', debounce(loadCakes, 500));
  maxPriceInput.addEventListener('input', debounce(loadCakes, 500));
}