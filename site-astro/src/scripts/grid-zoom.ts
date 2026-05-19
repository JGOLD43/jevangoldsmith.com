type Opts = { maxScale?: number; fillW?: number; fillH?: number; anchorSelector?: string; centerOffsetCssX?: number };
type State = { grid: HTMLElement; activeItem: HTMLElement | null; itemSelector: string; triggerSelector: string; opts: Opts };
type GridZoomConfig = { grid: string | HTMLElement; itemSelector?: string; triggerSelector?: string; maxScale?: number; fillW?: number; fillH?: number; anchorSelector?: string; eventName?: string; centerOffsetCssX?: number; bypassZoomForLinks?: boolean };

const instances: State[] = [];

function apply(grid: HTMLElement, item: HTMLElement, opts: Opts) {
  const gridRect = grid.getBoundingClientRect();
  const anchor: Element = opts && opts.anchorSelector
    ? item.querySelector(opts.anchorSelector) || item
    : item;
  const itemRect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxScale = (opts && opts.maxScale) || 5.6;
  const fillW = (opts && opts.fillW) || 0.82;
  const fillH = (opts && opts.fillH) || 0.72;
  const targetScale = Math.min(
    (vw * fillW) / itemRect.width,
    (vh * fillH) / itemRect.height,
    maxScale
  );
  const gridCx = gridRect.width / 2;
  const gridCy = gridRect.height / 2;
  const itemCxViewport = itemRect.left + itemRect.width / 2;
  const itemCyViewport = itemRect.top + itemRect.height / 2;
  const gridCxViewport = gridRect.left + gridCx;
  const gridCyViewport = gridRect.top + gridCy;
  const originX = gridCx;
  const originY = gridCy;
  const centerShiftVisualX = (opts?.centerOffsetCssX ?? 0) * targetScale;
  const tx = vw / 2 - centerShiftVisualX - (gridCxViewport + targetScale * (itemCxViewport - gridCxViewport));
  const ty = vh / 2 - (gridCyViewport + targetScale * (itemCyViewport - gridCyViewport));
  grid.style.setProperty('--origin-x', originX + 'px');
  grid.style.setProperty('--origin-y', originY + 'px');
  grid.style.setProperty('--tx', tx + 'px');
  grid.style.setProperty('--ty', ty + 'px');
  grid.style.setProperty('--scale', String(targetScale));
  grid.classList.add('is-zoomed');
  item.classList.add('is-zoom-target');
  document.body.classList.add('zoom-open');
}

function release(grid: HTMLElement) {
  grid.style.setProperty('--tx', '0px');
  grid.style.setProperty('--ty', '0px');
  grid.style.setProperty('--scale', '1');
  grid.classList.remove('is-zoomed');
  grid.querySelectorAll('.is-zoom-target').forEach(function (el: Element) {
    el.classList.remove('is-zoom-target');
  });
  document.body.classList.remove('zoom-open');
}

export function init(config: GridZoomConfig) {
  const grid = (typeof config.grid === 'string'
    ? document.querySelector(config.grid)
    : config.grid) as HTMLElement | null;
  if (!grid) return null;

  const itemSelector = config.itemSelector || '.zoom-item';
  const triggerSelector = config.triggerSelector || itemSelector;
  const opts = {
    maxScale: config.maxScale,
    fillW: config.fillW,
    fillH: config.fillH,
    anchorSelector: config.anchorSelector,
    centerOffsetCssX: config.centerOffsetCssX
  };

  const state: State = { grid, activeItem: null, itemSelector, triggerSelector, opts };

  function closeActive() {
    if (!state.activeItem) return;
    release(state.grid);
    state.activeItem = null;
  }

  function openItem(item: HTMLElement) {
    if (state.activeItem === item) {
      closeActive();
      return;
    }
    if (state.activeItem) release(state.grid);
    state.activeItem = item;
    apply(state.grid, item, state.opts);
  }

  grid.addEventListener('click', function (event: Event) {
    const target = event.target as Element | null;
    const trigger = target?.closest(triggerSelector);
    if (!trigger) return;
    const link = target?.closest('a') as HTMLAnchorElement | null;
    // Nested link inside the card (sub-link, "Letterboxd", etc.) — let
    // it navigate; don't zoom.
    if (link && link !== trigger && link.getAttribute('href') && link.getAttribute('href') !== '#') return;
    // The card itself is a link AND the caller opted out of the JS zoom —
    // let the browser handle the navigation natively so the cross-document
    // view-transition (see @view-transition rules) can morph the cover
    // from its grid position to the detail-page hero as a single
    // continuous animation, with zero pre-navigation phase.
    if (config.bypassZoomForLinks && link && link === trigger && link.getAttribute('href') && link.getAttribute('href') !== '#') {
      return;
    }
    const item = (trigger.closest(itemSelector) || trigger) as HTMLElement;
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    openItem(item);
    // Trigger itself is an anchor (book / movie card-link) — play the
    // full shelf-style zoom animation, then follow the href. 520ms
    // matches the `--duration` in the .js-zoom-grid CSS transition.
    if (link && link === trigger && link.getAttribute('href') && link.getAttribute('href') !== '#') {
      const href = link.href;
      setTimeout(function () { window.location.href = href; }, 520);
    }
  });

  grid.addEventListener('keydown', function (event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.key !== 'Enter' && ke.key !== ' ') return;
    const target = event.target as Element | null;
    const trigger = target?.closest(triggerSelector);
    if (!trigger) return;
    if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/i.test(trigger.tagName)) return;
    const item = (trigger.closest(itemSelector) || trigger) as HTMLElement;
    if (!item) return;
    event.preventDefault();
    openItem(item);
  });

  document.addEventListener('click', function (event) {
    if (!state.activeItem) return;
    if ((event.target as Element | null)?.closest(itemSelector)) return;
    closeActive();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && state.activeItem) closeActive();
  });

  window.addEventListener('resize', function () {
    if (state.activeItem) apply(state.grid, state.activeItem, state.opts);
  });

  instances.push(state);
  return {
    release: closeActive,
    refresh: function () {}
  };
}
