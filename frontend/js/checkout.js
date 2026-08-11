// checkout.js — turns the same "ticket" surface into a checkout form,
// then into a stamped order confirmation stub.

import { api } from './api.js';
import { showToast } from './main.js';
import { openQuickRatingPrompt } from './rating.js';

const ticket = document.getElementById('ticket');

export function renderCheckoutForm(basket) {
  ticket.innerHTML = `
    <div class="ticket__header">
      <span class="ticket__title">Checkout</span>
      <button class="ticket__close" id="ticket-close" aria-label="Close">✕</button>
    </div>

    <p class="ticket-line__unit" style="margin-bottom: 1rem;">
      ${basket.items.length} item${basket.items.length === 1 ? '' : 's'} · $${basket.totalAmount.toFixed(2)} total
    </p>

    <form class="ticket-form" id="checkout-form">
      <label for="checkout-email">Email for order confirmation</label>
      <input type="email" id="checkout-email" required placeholder="you@example.com" />
      <button type="submit" class="btn btn--primary btn--block" id="place-order-btn">
        Place order
      </button>
    </form>
  `;

  document.getElementById('ticket-close').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('drawer:close'));
  });

  document.getElementById('checkout-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('checkout-email').value;
    const submitBtn = document.getElementById('place-order-btn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order…';

    try {
      const { data: order } = await api.checkout(email);
      // basket.items is captured here (closure) rather than re-fetched, since the
      // basket is already emptied server-side by the time checkout resolves.
      renderConfirmation(order, basket.items);
      window.dispatchEvent(new CustomEvent('basket:changed'));
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place order';
    }
  });
}

function renderConfirmation(order, items) {
  const shortId = order.id.split('-')[0].toUpperCase();

  ticket.innerHTML = `
    <div class="ticket__header">
      <span class="ticket__title">Order confirmed</span>
      <button class="ticket__close" id="ticket-close" aria-label="Close">✕</button>
    </div>

    <div class="confirmation">
      <span class="confirmation__stamp">Confirmed</span>
      <p class="ticket-line__unit">Order No.</p>
      <p class="confirmation__order-id">#${shortId}</p>
      <p class="confirmation__note">
        Total charged: $${order.totalAmount.toFixed(2)}<br />
        A confirmation email is on its way.
      </p>
    </div>

    <div class="rate-purchase">
      <p class="ticket-line__unit" style="margin-bottom: 0.6rem;">How was it? Rate what you ordered:</p>
      ${items
        .map(
          (item) => `
        <div class="ticket-line">
          <span class="ticket-line__name">${item.cakeName}</span>
          <button class="btn btn--ghost" data-rate-cake="${item.cakeId}" data-rate-name="${item.cakeName}">
            Rate ★
          </button>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  document.getElementById('ticket-close').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('drawer:close'));
  });

  ticket.querySelectorAll('[data-rate-cake]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openQuickRatingPrompt(btn.dataset.rateCake, btn.dataset.rateName);
    });
  });
}