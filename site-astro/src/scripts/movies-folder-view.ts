// Movies-page parallel to the books folder view: grid toggle that
// swaps between the standard genre-sectioned list and a Kindle-style
// folder grid (one card per genre). Tapping a card opens a 3-col
// modal of all movies in that genre; tapping a movie inside the modal
// triggers the same cover-flight animation as the list view.

import moviesRuntimeData from '../../../data/movies.json';
import { onDomReady } from './dom-ready';
import { flyCover } from './cover-flight';
import { ratingTier } from '../lib/rating-tier';
import { slugify } from '../lib/slug';
import { trapFocus } from '../lib/focus-trap';

type MovieLite = {
    title?: string | null;
    poster?: string | null;
    genre?: string | null;
    starCount?: number | null;
};

const MOVIES_LIST_ID = 'movies-container';
const GRID_VIEW_ID = 'movies-genre-grid-view';
const TOGGLE_ID = 'movies-view-toggle';
const MODAL_ID = 'genre-expanded-modal';
const MODAL_TITLE_ID = 'genre-expanded-title';
const MODAL_LIST_ID = 'genre-expanded-movies';
const MODAL_TEMPLATE_ID = 'genre-expanded-movie-template';

// Same cfg the listing uses (see letterboxd.ts). Duplicated here so we
// can fire flyCover() directly from the genre modal without trying to
// route through the listing's click handler (which would require the
// listing to be visible in DOM at click time).
const MOVIE_FLIGHT_CFG = {
    grid: document.body, // unused for direct flyCover calls
    cardSelector: 'a.movie-card',
    coverSelector: 'img.movie-poster',
    detailMainSelector: 'main.detail-page--movie',
    detailHeroImgSelector: '.detail-hero-poster img',
    bodyLaunchClass: 'is-movie-launching',
    arrivalKey: 'movie',
    listingBackSelectors: ['.movies-sidebar', '.collection-sidebar']
};

let releaseGenreModalFocus: (() => void) | null = null;
let currentMode: 'list' | 'grid' = 'list';
let isViewTransitioning = false;

function updateViewToggle(mode: 'list' | 'grid') {
    const btn = document.getElementById(TOGGLE_ID);
    if (!btn) return;
    btn.dataset.currentMode = mode;
    const nextLabel = mode === 'list' ? 'Switch to genre grid view' : 'Switch to list view';
    btn.setAttribute('aria-label', nextLabel);
    btn.setAttribute('title', nextLabel);
}

function setElementVisible(element: HTMLElement, visible: boolean, isGrid: boolean) {
    element.style.display = visible ? (isGrid ? 'block' : '') : 'none';
}

function setViewMode(mode: 'list' | 'grid') {
    if (mode === currentMode || isViewTransitioning) return;
    const list = document.getElementById(MOVIES_LIST_ID) as HTMLElement | null;
    const grid = document.getElementById(GRID_VIEW_ID) as HTMLElement | null;
    const sidebar = document.getElementById('movies-sidebar');
    const previousMode = currentMode;
    currentMode = mode;
    if (sidebar) sidebar.style.display = mode === 'grid' ? 'none' : '';
    updateViewToggle(mode);

    const canAnimate = Boolean(
        list
        && grid
        && window.matchMedia('(max-width: 768px) and (prefers-reduced-motion: no-preference)').matches
    );
    if (!canAnimate || !list || !grid) {
        setElementVisible(list, mode === 'list', false);
        setElementVisible(grid, mode === 'grid', true);
        return;
    }

    const outgoing = previousMode === 'list' ? list : grid;
    const incoming = mode === 'list' ? list : grid;
    const enteringGrid = mode === 'grid';
    const direction = enteringGrid ? 1 : -1;
    const transitionHost = outgoing.closest('.movies-main') as HTMLElement | null;

    isViewTransitioning = true;
    setElementVisible(incoming, true, enteringGrid);
    if (transitionHost) {
        transitionHost.classList.add('is-mobile-view-transitioning');
        transitionHost.style.minHeight = `${Math.max(outgoing.offsetHeight, incoming.offsetHeight)}px`;
    }
    outgoing.style.position = 'absolute';
    outgoing.style.inset = '0 auto auto 0';
    outgoing.style.width = '100%';
    outgoing.style.pointerEvents = 'none';

    const animationOptions: KeyframeAnimationOptions = {
        duration: 360,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both'
    };
    const outgoingAnimation = outgoing.animate([
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        { opacity: 0, transform: `translate3d(${-direction * 10}%, 0, 0) scale(0.965)` }
    ], animationOptions);
    const incomingAnimation = incoming.animate([
        { opacity: 0, transform: `translate3d(${direction * 14}%, 0, 0) scale(0.96)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
    ], animationOptions);

    void Promise.all([
        outgoingAnimation.finished.catch(() => undefined),
        incomingAnimation.finished.catch(() => undefined)
    ]).then(() => {
        setElementVisible(outgoing, false, outgoing === grid);
        outgoing.style.position = '';
        outgoing.style.inset = '';
        outgoing.style.width = '';
        outgoing.style.pointerEvents = '';
        outgoing.style.opacity = '';
        outgoing.style.transform = '';
        incoming.style.opacity = '';
        incoming.style.transform = '';
        if (transitionHost) {
            transitionHost.classList.remove('is-mobile-view-transitioning');
            transitionHost.style.minHeight = '';
        }
        isViewTransitioning = false;
    });
}

function openGenreModal(genre: string) {
    const list = (moviesRuntimeData as MovieLite[])
        .filter((m) => (m.genre || 'Uncategorized') === genre)
        .sort((a, b) => Number(b.starCount || 0) - Number(a.starCount || 0)
            || String(a.title || '').localeCompare(String(b.title || '')));
    const modal = document.getElementById(MODAL_ID);
    const title = document.getElementById(MODAL_TITLE_ID);
    const container = document.getElementById(MODAL_LIST_ID);
    const template = document.getElementById(MODAL_TEMPLATE_ID) as HTMLTemplateElement | null;
    if (!modal || !title || !container || !template) return;
    title.textContent = genre;
    const fragment = document.createDocumentFragment();
    list.forEach((movie) => {
        const slug = slugify(movie.title || '');
        if (!slug || !movie.poster) return;
        const clone = template.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
        if (!clone) return;
        const img = clone.querySelector('img') as HTMLImageElement | null;
        if (!img) return;
        clone.dataset.slug = slug;
        const tier = ratingTier(Number(movie.starCount || 0));
        clone.setAttribute('aria-label', `${movie.title || ''}${tier ? ` — ${tier.label}` : ''}`);
        img.src = movie.poster;
        img.alt = movie.title || '';
        img.title = movie.title || '';
        const badge = clone.querySelector('.category-tier-badge') as HTMLElement | null;
        if (badge && tier) {
            badge.textContent = tier.label;
            badge.classList.add(`category-tier-badge--${tier.key}`);
            badge.style.backgroundColor = tier.color;
            badge.hidden = false;
        }
        fragment.appendChild(clone);
    });
    container.replaceChildren(fragment);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const trigger = document.activeElement as HTMLElement | null;
    releaseGenreModalFocus = trapFocus(modal, trigger);
}

function closeGenreModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    releaseGenreModalFocus?.();
    releaseGenreModalFocus = null;
}

function init() {
    const list = document.getElementById(MOVIES_LIST_ID);
    if (!list) return;

    document.addEventListener('click', (event) => {
        const target = event.target as Element | null;
        if (!target) return;
        const toggle = target.closest?.('[data-action="toggle-movies-view-mode"]') as HTMLElement | null;
        if (toggle) {
            event.preventDefault();
            setViewMode(currentMode === 'list' ? 'grid' : 'list');
            return;
        }
        const genreCard = target.closest?.('[data-action="open-genre-modal"]') as HTMLElement | null;
        if (genreCard) {
            openGenreModal(genreCard.dataset.genre || '');
            return;
        }
        if (target.closest?.('[data-action="close-genre-modal"]')) {
            closeGenreModal();
            return;
        }
        const movieItem = target.closest?.('[data-action="open-movie-from-grid"]') as HTMLElement | null;
        if (movieItem) {
            event.preventDefault();
            const slug = movieItem.dataset.slug || '';
            if (!slug) return;
            const cover = movieItem.querySelector('img') as HTMLImageElement | null;
            const href = `/movies/${slug}.html`;
            if (cover) {
                // Fire the flight BEFORE closing the modal so the source
                // rect is still valid (closeGenreModal hides the modal
                // via display:none, which would zero the cover rect).
                flyCover(cover, href, MOVIE_FLIGHT_CFG);
                closeGenreModal();
            } else {
                window.location.href = href;
            }
        }
    });
}

onDomReady(init, 'movies-folder-view init');
