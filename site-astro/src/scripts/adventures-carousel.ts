import { escapeAttr, escapeHtml } from '../lib/html-escape';
import { state } from './adventures-state';
import type { AdventureRecord } from './adventures-types';

export function renderMapCarousel(adventures: AdventureRecord[], selectAdventure: (id: string) => void) {
    const wrap = document.getElementById('adventures-map-carousel-wrap');
    const carousel = document.getElementById('adventures-map-carousel');
    if (!wrap || !carousel) return;
    if (adventures.length === 0) {
        wrap.hidden = true;
        return;
    }

    wrap.hidden = state.mapFilters?.layers?.adventures !== true;
    if (carousel.children.length > 0) {
        bindCarouselClicks(carousel, selectAdventure);
        attachMapCarouselToggle(wrap);
        return;
    }

    carousel.innerHTML = adventures.map((adventure) => {
        const year = adventure.startDate ? String(adventure.startDate).slice(0, 4) : '';
        const place = adventure.location || '';
        const img = adventure.heroImage
            ? `<img class="adv-carousel-img" src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" loading="lazy" decoding="async">`
            : '<span class="adv-carousel-img adv-carousel-img-fallback" aria-hidden="true"></span>';
        return `<button type="button" class="adv-carousel-card" data-adventure-id="${escapeAttr(adventure.id)}">
            ${img}
            <span class="adv-carousel-meta">
                <span class="adv-carousel-place">${escapeHtml(place)}</span>
                ${year ? `<span class="adv-carousel-year">${escapeHtml(year)}</span>` : ''}
            </span>
        </button>`;
    }).join('');
    bindCarouselClicks(carousel, selectAdventure);
    attachMapCarouselToggle(wrap);
}

function bindCarouselClicks(carousel: HTMLElement, selectAdventure: (id: string) => void) {
    if (carousel.dataset.clickBound === 'true') return;
    carousel.dataset.clickBound = 'true';
    carousel.addEventListener('click', (event: Event) => {
        const card = (event.target as Element | null)?.closest?.('[data-adventure-id]') as HTMLElement | null;
        if (!card) return;
        selectAdventure(card.dataset.adventureId || '');
    });
}

function attachMapCarouselToggle(wrap: HTMLElement) {
    if (wrap.dataset.toggleBound === 'true') return;
    wrap.dataset.toggleBound = 'true';
    const handle = wrap.querySelector('#adv-carousel-handle') as HTMLButtonElement | null;
    if (!handle) return;
    const setHidden = (hidden: boolean) => {
        wrap.classList.toggle('is-collapsed', hidden);
        handle.setAttribute('aria-expanded', String(!hidden));
        handle.setAttribute('aria-label', hidden ? 'Show trips' : 'Hide trips');
    };
    handle.addEventListener('click', () => setHidden(!wrap.classList.contains('is-collapsed')));
    let startY: number | null = null;
    let collapsedAtStart = false;
    wrap.addEventListener('touchstart', (event: TouchEvent) => {
        if (!event.touches[0]) return;
        startY = event.touches[0].clientY;
        collapsedAtStart = wrap.classList.contains('is-collapsed');
    }, { passive: true });
    wrap.addEventListener('touchend', (event: TouchEvent) => {
        if (startY === null) return;
        const endY = (event.changedTouches[0]?.clientY) ?? startY;
        const dy = endY - startY;
        startY = null;
        if (!collapsedAtStart && dy > 30) setHidden(true);
        if (collapsedAtStart && dy < -20) setHidden(false);
    }, { passive: true });
}
