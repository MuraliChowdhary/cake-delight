// rating.js — cake detail modal: description, existing ratings, average, and the submit-rating form.

import { api } from './api.js';
import { showToast } from './main.js';

const overlay = document.getElementById('cake-modal-overlay');
const closeBtn = document.getElementById('cake-modal-close');
const body = document.getElementById('cake-modal-body');

function closeModal() {
  overlay.hidden = true;
}

function starString(score) {
  return '★'.repeat(score) + '☆'.repeat(5 - score);
}

function renderRatingsSection(cake, ratings, average) {
  const listHtml = ratings.length
    ? ratings
        .map(
          (r) => `
      <li class="rating-item">
        <span class="rating-item__stars">${starString(r.score)}</span>
        ${r.comment ? `<p class="rating-item__comment">${r.comment}</p>` : ''}
      </li>
    `
        )
        .join('')
    : '<li class="rating-item">No reviews yet — be the first.</li>';

  body.innerHTML = `
    <p class="cake-modal__category">${cake.category}</p>
    <h2 class="cake-modal__title">${cake.name}</h2>
    <p class="cake-modal__desc">${cake.description || ''}</p>

    <div class="cake-modal__price-row">
      <span class="cake-modal__price">$${cake.price.toFixed(2)}</span>
      ${
        cake.isAvailable
          ? `<button class="btn btn--primary" id="modal-add-btn">Add to basket</button>`
          : `<span class="cake-card__unavailable">Sold out</span>`
      }
    </div>

    <div class="rating-summary">
      <span class="rating-summary__stars">${starString(Math.round(average.averageScore))}</span>
      <span class="rating-summary__count">${average.averageScore.toFixed(2)} · ${average.totalReviews} review${average.totalReviews === 1 ? '' : 's'}</span>
    </div>

    <ul class="rating-list">${listHtml}</ul>

    <form class="rating-form" id="rating-form">
      <label>Your rating</label>
      <div class="star-select" id="star-select">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-score="${n}">★</button>`).join('')}
      </div>
      <textarea id="rating-comment" placeholder="Optional comment…"></textarea>
      <button type="submit" class="btn btn--primary btn--block">Submit rating</button>
    </form>
  `;

  let selectedScore = 0;
  const starButtons = body.querySelectorAll('#star-select button');
  starButtons.forEach((starBtn) => {
    starBtn.addEventListener('click', () => {
      selectedScore = Number(starBtn.dataset.score);
      starButtons.forEach((b) => b.classList.toggle('selected', Number(b.dataset.score) <= selectedScore));
    });
  });

  if (cake.isAvailable) {
    document.getElementById('modal-add-btn').addEventListener('click', async () => {
      try {
        await api.addToBasket(cake.id, 1);
        showToast(`${cake.name} added to basket`);
        window.dispatchEvent(new CustomEvent('basket:changed'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  document.getElementById('rating-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (selectedScore === 0) {
      showToast('Pick a star rating first', 'error');
      return;
    }

    const comment = document.getElementById('rating-comment').value.trim();

    try {
      await api.submitRating(cake.id, { score: selectedScore, comment });
      showToast('Thanks for rating!');
      const [{ data: freshRatings }, { data: freshAverage }] = await Promise.all([
        api.getRatings(cake.id),
        api.getAverageRating(cake.id),
      ]);
      renderRatingsSection(cake, freshRatings, freshAverage);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export async function openCakeModal(cake) {
  overlay.hidden = false;
  body.innerHTML = '<p class="ticket__empty">Loading…</p>';

  try {
    const [{ data: ratings }, { data: average }] = await Promise.all([
      api.getRatings(cake.id),
      api.getAverageRating(cake.id),
    ]);
    renderRatingsSection(cake, ratings, average);
  } catch (err) {
    body.innerHTML = `<p class="error-state">Couldn't load ratings: ${err.message}</p>`;
  }
}

// Lightweight rating prompt shown right after checkout confirmation — matches the
// intended journey (browse → details → cart → order → checkout → notification → rate).
// This is deliberately separate from openCakeModal: at this point we only know the
// cake's id/name from the order line item, not its full catalog record.
export function openQuickRatingPrompt(cakeId, cakeName) {
  overlay.hidden = false;

  body.innerHTML = `
    <h2 class="cake-modal__title">Rate ${cakeName}</h2>
    <p class="cake-modal__desc">How was it? Your rating helps other customers pick.</p>

    <form class="rating-form" id="quick-rating-form" style="border-top: none; padding-top: 0.6rem;">
      <label>Your rating</label>
      <div class="star-select" id="quick-star-select">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-score="${n}">★</button>`).join('')}
      </div>
      <textarea id="quick-rating-comment" placeholder="Optional comment…"></textarea>
      <button type="submit" class="btn btn--primary btn--block">Submit rating</button>
    </form>
  `;

  let selectedScore = 0;
  const starButtons = body.querySelectorAll('#quick-star-select button');
  starButtons.forEach((starBtn) => {
    starBtn.addEventListener('click', () => {
      selectedScore = Number(starBtn.dataset.score);
      starButtons.forEach((b) => b.classList.toggle('selected', Number(b.dataset.score) <= selectedScore));
    });
  });

  document.getElementById('quick-rating-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (selectedScore === 0) {
      showToast('Pick a star rating first', 'error');
      return;
    }

    const comment = document.getElementById('quick-rating-comment').value.trim();

    try {
      await api.submitRating(cakeId, { score: selectedScore, comment });
      showToast(`Thanks for rating ${cakeName}!`);
      closeModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export function initRatingModal() {
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}