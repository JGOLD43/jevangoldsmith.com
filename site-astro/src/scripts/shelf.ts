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

function initShelf() {
  const grid = document.querySelector<HTMLElement>('.shelf-grid');
  const shelf = document.querySelector<HTMLElement>('.shelf-page');
  const back = document.querySelector<HTMLButtonElement>('[data-shelf-back]');
  if (!grid || !shelf || !back) return;
  const mobile = window.matchMedia('(max-width: 760px)');
  let expandedItem: HTMLElement | null = null;
  let previousScroll = 0;

  function closeMobileDetail() {
    if (!expandedItem) return;
    const trigger = expandedItem.querySelector<HTMLButtonElement>('[data-shelf-item]');
    expandedItem.classList.remove('is-expanded');
    expandedItem.querySelector('.shelf-object-detail')?.setAttribute('aria-hidden', 'true');
    trigger?.setAttribute('aria-expanded', 'false');
    shelf!.classList.remove('shelf-detail-open');
    expandedItem = null;
    trigger?.focus({ preventScroll: true });
    window.scrollTo({ top: previousScroll, behavior: 'instant' });
  }

  // A scaled grid cannot grow the document to fit its mobile description.
  // Open a normal full-width item instead, keeping all its details in flow.
  grid.addEventListener('click', function (event) {
    if (!mobile.matches) return;
    const trigger = (event.target as Element | null)?.closest<HTMLElement>('[data-shelf-item]');
    const item = trigger?.closest<HTMLElement>('.shelf-item');
    if (!item) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (expandedItem) {
      closeMobileDetail();
      return;
    }
    previousScroll = window.scrollY;
    expandedItem = item;
    item.classList.add('is-expanded');
    item.querySelector('.shelf-object-detail')?.setAttribute('aria-hidden', 'false');
    trigger?.setAttribute('aria-expanded', 'true');
    shelf.classList.add('shelf-detail-open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    back.focus({ preventScroll: true });
  }, true);

  back.addEventListener('click', closeMobileDetail);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMobileDetail();
  });

  grid.classList.add('js-zoom-grid');
  document.querySelectorAll('.shelf-item').forEach(function (el) {
    el.classList.add('js-zoom-item');
  });
  const zoom = initGridZoom({
    grid,
    itemSelector: '.shelf-item',
    triggerSelector: '[data-shelf-item]',
    eventName: 'shelf_object_open',
    centerOffsetCssX: 139,
  }) as { release: () => void } | null;

  initFilters(zoom);
  mobile.addEventListener('change', function () {
    closeMobileDetail();
    zoom?.release();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShelf);
} else {
  initShelf();
}
