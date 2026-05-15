import { init as initGridZoom } from './grid-zoom';

type ShelfCard = HTMLElement & { shelfFilterTimer?: number };

function initFilters(zoom: { release: () => void } | null | undefined) {
  const filter = document.querySelector<HTMLElement>('[data-shelf-filter]');
  const cards = Array.from(document.querySelectorAll<ShelfCard>('[data-shelf-card]'));
  if (!filter || cards.length === 0) return;

  function setCards(category: string | undefined) {
    let visibleIndex = 0;
    cards.forEach(function (card) {
      const visible = category === 'all' || card.dataset.category === category;
      const item = card.querySelector<HTMLElement>('[data-shelf-item]');
      if (card.shelfFilterTimer) window.clearTimeout(card.shelfFilterTimer);
      if (visible) card.hidden = false;
      card.style.setProperty('--shelf-filter-index', String(visibleIndex));
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
    const button = (event.target as Element | null)?.closest?.('[data-shelf-category]') as HTMLElement | null;
    if (!button) return;
    const category = button.dataset.shelfCategory;
    filter.querySelectorAll('[data-shelf-category]').forEach(function (item) {
      item.classList.toggle('active', item === button);
    });
    setCards(category);
    if (zoom) zoom.release();
  });
}

function initShelfDetailMoreToggle() {
  // Mobile-only "See further description" toggle. The button is rendered for
  // every product but CSS hides it (and shows the content unconditionally) on
  // desktop, so this handler is harmless above 760px.
  document.addEventListener('click', function (event) {
    const btn = (event.target as Element | null)?.closest?.('[data-shelf-detail-more]') as HTMLButtonElement | null;
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const card = btn.closest('.shelf-item');
    const expanded = card?.classList.toggle('shelf-details-open') ?? false;
    btn.setAttribute('aria-expanded', String(expanded));
    btn.textContent = expanded ? 'Hide description' : 'See further description';
    if (expanded) {
      // Wait for the panel to mount, then bring the bottom into view.
      requestAnimationFrame(() => {
        const extra = card?.querySelector('.shelf-object-detail-extra');
        extra?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  });
}

function initShelf() {
  const grid = document.querySelector('.shelf-grid');
  if (!grid) return;
  grid.classList.add('js-zoom-grid');
  document.querySelectorAll('.shelf-item').forEach(function (el) {
    el.classList.add('js-zoom-item');
  });
  initShelfDetailMoreToggle();

  // On mobile the detail panel renders BELOW the image (CSS handles layout),
  // so no horizontal centerOffset is needed and the image should take less
  // vertical room to leave space for the text.
  const isMobile = window.innerWidth <= 760;
  const zoom = initGridZoom({
    grid: grid as HTMLElement,
    itemSelector: '.shelf-item',
    triggerSelector: '[data-shelf-item]',
    eventName: 'shelf_object_open',
    centerOffsetCssX: isMobile ? 0 : 139,
    fillW: isMobile ? 0.7 : undefined,
    fillH: isMobile ? 0.32 : undefined,
    maxScale: isMobile ? 3.2 : undefined
  }) as { release: () => void } | null;

  initFilters(zoom);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShelf);
} else {
  initShelf();
}
