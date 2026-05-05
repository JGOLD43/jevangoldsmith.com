// @ts-nocheck — strict typing deferred; runtime is covered by Playwright + smoke. See POST_AUDIT_PLAN slice 3.3.
(function () {
  'use strict';

  function track(name, details) {
    if (window.JGAnalytics && typeof window.JGAnalytics.track === 'function') {
      window.JGAnalytics.track(name, details);
    }
  }

  function initFilters(zoom) {
    const filter = document.querySelector('[data-shelf-filter]');
    const cards = Array.from(document.querySelectorAll('[data-shelf-card]'));
    if (!filter || cards.length === 0) return;

    function setCards(category) {
      let visibleIndex = 0;
      cards.forEach(function (card) {
        const visible = category === 'all' || card.dataset.category === category;
        const item = card.querySelector('[data-shelf-item]');
        window.clearTimeout(card.shelfFilterTimer);
        if (visible) card.hidden = false;
        card.style.setProperty('--shelf-filter-index', visibleIndex);
        card.classList.toggle('is-filtered-out', !visible);
        card.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (item) item.tabIndex = visible ? 0 : -1;
        if (!visible) {
          card.shelfFilterTimer = window.setTimeout(function () {
            card.hidden = true;
          }, 360);
        }
        if (visible) visibleIndex += 1;
      });
    }

    filter.addEventListener('click', function (event) {
      const button = event.target.closest('[data-shelf-category]');
      if (!button) return;
      const category = button.dataset.shelfCategory;
      filter.querySelectorAll('[data-shelf-category]').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      setCards(category);
      if (zoom) zoom.release();
      track('shelf_filter', { category });
    });
  }

  function initShelf() {
    const grid = document.querySelector('.shelf-grid');
    if (!grid) return;
    grid.classList.add('js-zoom-grid');
    document.querySelectorAll('.shelf-item').forEach(function (el) {
      el.classList.add('js-zoom-item');
    });

    const zoom = window.JGGridZoom && window.JGGridZoom.init({
      grid: grid,
      itemSelector: '.shelf-item',
      triggerSelector: '[data-shelf-item]',
      eventName: 'shelf_object_open'
    });

    initFilters(zoom);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShelf);
  } else {
    initShelf();
  }
}());

export {};
