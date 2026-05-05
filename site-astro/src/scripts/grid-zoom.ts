(function () {
  'use strict';

  type Opts = { maxScale?: number; fillW?: number; fillH?: number; anchorSelector?: string };
  type State = { grid: HTMLElement; activeItem: HTMLElement | null; itemSelector: string; triggerSelector: string; opts: Opts };
  type Config = { grid: string | HTMLElement; itemSelector?: string; triggerSelector?: string; maxScale?: number; fillW?: number; fillH?: number; anchorSelector?: string; eventName?: string };

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
    const tx = vw / 2 - (gridCxViewport + targetScale * (itemCxViewport - gridCxViewport));
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

  function init(config: Config) {
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
      anchorSelector: config.anchorSelector
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
      if (target?.closest('.zoom-detail-link, a')) {
        const link = target.closest('a') as HTMLAnchorElement | null;
        if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') return;
      }
      const trigger = target?.closest(triggerSelector);
      if (!trigger) return;
      const item = (trigger.closest(itemSelector) || trigger) as HTMLElement;
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      openItem(item);
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

  window.JGGridZoom = { init: init as (c: unknown) => unknown, release: function (grid: unknown) { release(grid as HTMLElement); } };
}());

export const gridZoom = window.JGGridZoom;
