import { init as initGridZoom } from './grid-zoom';
import { TIMING } from './timing';

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
  const frame = document.querySelector<HTMLElement>('.shelf-grid-frame');
  const shelf = document.querySelector<HTMLElement>('.shelf-page');
  const back = document.querySelector<HTMLButtonElement>('[data-shelf-back]');
  if (!grid || !frame || !shelf || !back) return;
  const mobile = window.matchMedia('(max-width: 760px)');
  let activeItem: HTMLElement | null = null;
  let previousScroll = 0;
  let animationFrame = 0;
  let closeTimer = 0;

  function syncHeight() {
    if (!activeItem || !shelf!.classList.contains('shelf-zoom-layout')) return;
    // Desktop details sit beside the item and can extend beyond its box.
    // Include both the photo and the full text when placing the footer.
    const bottom = Math.max(
      activeItem.getBoundingClientRect().bottom,
      activeItem.querySelector('.shelf-object-photo')?.getBoundingClientRect().bottom ?? 0,
      activeItem.querySelector('.shelf-object-detail')?.getBoundingClientRect().bottom ?? 0,
    );
    const top = frame!.getBoundingClientRect().top;
    frame!.style.height = Math.max(0, Math.ceil(bottom - top)) + 'px';
  }

  const observer = new ResizeObserver(syncHeight);

  function finishClose() {
    shelf!.classList.remove('shelf-zoom-layout');
    shelf!.style.removeProperty('--shelf-back-top');
    frame!.style.height = '';
    closeTimer = 0;
  }

  function openDetail(item: HTMLElement) {
    window.clearTimeout(closeTimer);
    cancelAnimationFrame(animationFrame);
    activeItem = item;
    item.querySelector('.shelf-object-detail')?.setAttribute('aria-hidden', 'false');
    item.querySelector('[data-shelf-item]')?.setAttribute('aria-expanded', 'true');
    previousScroll = window.scrollY;
    frame!.style.height = frame!.offsetHeight + 'px';
    shelf!.classList.add('shelf-zoom-layout');
    observer.observe(item);
    const detail = item.querySelector('.shelf-object-detail');
    if (detail) observer.observe(detail);
    const started = performance.now();
    function followAnimation() {
      syncHeight();
      if (performance.now() - started < TIMING.gridZoomFlight + 50) {
        animationFrame = requestAnimationFrame(followAnimation);
      }
    }
    animationFrame = requestAnimationFrame(followAnimation);
  }

  function closeDetail() {
    const trigger = activeItem?.querySelector<HTMLButtonElement>('[data-shelf-item]');
    activeItem?.querySelector('.shelf-object-detail')?.setAttribute('aria-hidden', 'true');
    trigger?.setAttribute('aria-expanded', 'false');
    activeItem = null;
    observer.disconnect();
    cancelAnimationFrame(animationFrame);
    if (!shelf!.classList.contains('shelf-zoom-layout')) return;
    window.scrollTo({ top: previousScroll, behavior: 'instant' });
    trigger?.focus({ preventScroll: true });
    // Keep the same containing block through the reverse zoom, then restore
    // the normal grid's height once the original animation has finished.
    closeTimer = window.setTimeout(finishClose, TIMING.gridZoomFlight);
  }

  const zoomOptions = () => mobile.matches
    ? { centerOffsetCssX: 0, fillW: 0.7, fillH: 0.32, maxScale: 3.2 }
    : { centerOffsetCssX: 139, fillW: 0.82, fillH: 0.72, maxScale: 5.6 };

  function mobileDetailTop(item: HTMLElement, scale: number) {
    if (!mobile.matches) return undefined;
    const navBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0;
    const backTop = navBottom + 16;
    shelf!.style.setProperty('--shelf-back-top', `${backTop - shelf!.getBoundingClientRect().top}px`);

    // Keep the original zoom size and motion, but land the photo beneath
    // the back button instead of halfway down a potentially tall viewport.
    const itemTop = item.getBoundingClientRect().top;
    const imageTop = item.querySelector('.shelf-object-photo')?.getBoundingClientRect().top ?? itemTop;
    return backTop + back!.getBoundingClientRect().height + 24 - (imageTop - itemTop) * scale;
  }

  grid.classList.add('js-zoom-grid');
  grid.querySelectorAll('.shelf-item').forEach(function (el) {
    el.classList.add('js-zoom-item');
  });
  const zoom = initGridZoom({
    grid,
    itemSelector: '.shelf-item',
    triggerSelector: '[data-shelf-item]',
    eventName: 'shelf_object_open',
    ...zoomOptions(),
    recenterOnResize: false,
    targetTop: mobileDetailTop,
    onOpen: openDetail,
    onClose: closeDetail,
  });

  back.addEventListener('click', () => zoom?.release());
  initFilters(zoom);
  mobile.addEventListener('change', function () {
    zoom?.release();
    window.clearTimeout(closeTimer);
    finishClose();
    zoom?.refresh(zoomOptions());
  });
  let viewportWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    // Mobile browser chrome changes the viewport height while scrolling.
    // Keep the existing zoom instead of scaling the already enlarged item.
    if (viewportWidth !== window.innerWidth) {
      viewportWidth = window.innerWidth;
      zoom?.release();
      zoom?.refresh(zoomOptions());
    }
    syncHeight();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShelf);
} else {
  initShelf();
}
