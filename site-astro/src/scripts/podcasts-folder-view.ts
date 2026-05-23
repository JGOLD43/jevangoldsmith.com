// Podcasts-page parallel to movies-folder-view + book-stats. Wires
// up: the Stats toggle, the grid view toggle (Kindle-style category
// folders), and the category modal (3-col grid of podcasts in that
// category).

import { onDomReady } from './dom-ready';
import { tryReadString, tryWrite } from '../lib/storage';
import { trapFocus } from '../lib/focus-trap';

const STATS_PANEL_ID = 'podcast-stats-panel';
const STATS_BTN = '.podcast-stats-toggle';
const STATS_KEY = 'podcast-stats-collapsed';

const LIST_ID = 'podcasts-container';
const GRID_VIEW_ID = 'podcasts-category-grid-view';
const TOGGLE_ID = 'podcasts-view-toggle';
const MODAL_ID = 'podcast-category-modal';
const MODAL_TITLE_ID = 'podcast-category-title';
const MODAL_LIST_ID = 'podcast-category-list';

let releaseModalFocus: (() => void) | null = null;
let currentMode: 'list' | 'grid' = 'list';

function setStatsOpen(open: boolean) {
    const panel = document.getElementById(STATS_PANEL_ID);
    if (!panel) return;
    const btn = document.querySelector<HTMLButtonElement>(STATS_BTN);
    panel.classList.toggle('collapsed', !open);
    panel.hidden = !open;
    if (btn) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Hide listening stats' : 'Show listening stats');
    }
}

function toggleStats() {
    const panel = document.getElementById(STATS_PANEL_ID);
    if (!panel) return;
    const open = panel.hasAttribute('hidden');
    setStatsOpen(open);
    tryWrite(STATS_KEY, open ? '0' : '1');
}

function setViewMode(mode: 'list' | 'grid') {
    currentMode = mode;
    const list = document.getElementById(LIST_ID);
    const grid = document.getElementById(GRID_VIEW_ID);
    const sidebar = document.getElementById('podcasts-sidebar');
    const spotifyRecent = document.getElementById('spotify-recent-section');
    const spotifyShows = document.getElementById('spotify-shows-section');
    if (list) list.style.display = mode === 'grid' ? 'none' : '';
    if (grid) grid.style.display = mode === 'grid' ? 'block' : 'none';
    if (sidebar) sidebar.style.display = mode === 'grid' ? 'none' : '';
    // Hide the Spotify sections in grid view too — the folder grid
    // owns the whole page.
    if (spotifyRecent) spotifyRecent.style.display = mode === 'grid' ? 'none' : '';
    if (spotifyShows) spotifyShows.style.display = mode === 'grid' ? 'none' : '';
    const btn = document.getElementById(TOGGLE_ID);
    if (btn) {
        btn.dataset.currentMode = mode;
        const nextLabel = mode === 'list' ? 'Switch to category grid view' : 'Switch to list view';
        btn.setAttribute('aria-label', nextLabel);
        btn.setAttribute('title', nextLabel);
    }
}

function openCategoryModal(category: string) {
    const modal = document.getElementById(MODAL_ID);
    const title = document.getElementById(MODAL_TITLE_ID);
    const container = document.getElementById(MODAL_LIST_ID);
    if (!modal || !title || !container) return;
    title.textContent = category;
    // Find podcast cards in the original listing that match this
    // category and clone-render them as a 3-col grid. We use the
    // existing PodcastCard markup so the visual matches the list.
    const cards = Array.from(document.querySelectorAll(`#${LIST_ID} .podcast-card`));
    const matching = cards.filter((c) => {
        const cat = (c as HTMLElement).dataset.category || (c as HTMLElement).getAttribute('data-category') || '';
        return cat === category;
    });
    const fragment = document.createDocumentFragment();
    matching.forEach((card) => {
        const img = card.querySelector('img');
        const titleEl = card.querySelector('.movie-title');
        if (!img) return;
        const item = document.createElement('div');
        item.className = 'category-expanded-book';
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.setAttribute('aria-label', titleEl?.textContent || '');
        const cardHref = card.getAttribute('href');
        if (cardHref) item.dataset.href = cardHref;
        const clonedImg = img.cloneNode(true) as HTMLImageElement;
        clonedImg.removeAttribute('id');
        item.appendChild(clonedImg);
        fragment.appendChild(item);
    });
    container.replaceChildren(fragment);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const trigger = document.activeElement as HTMLElement | null;
    releaseModalFocus = trapFocus(modal, trigger);
}

function closeCategoryModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    releaseModalFocus?.();
    releaseModalFocus = null;
}

function init() {
    // Stats toggle init.
    const statsBtn = document.querySelector<HTMLButtonElement>(STATS_BTN);
    if (statsBtn) statsBtn.addEventListener('click', toggleStats);
    setStatsOpen(tryReadString(STATS_KEY) === '0');

    // Grid view toggle + category modal click delegation.
    document.addEventListener('click', (event) => {
        const target = event.target as Element | null;
        if (!target) return;
        if (target.closest?.('[data-action="toggle-podcasts-view-mode"]')) {
            event.preventDefault();
            setViewMode(currentMode === 'list' ? 'grid' : 'list');
            return;
        }
        const card = target.closest?.('[data-action="open-podcast-category-modal"]') as HTMLElement | null;
        if (card) {
            openCategoryModal(card.dataset.category || '');
            return;
        }
        if (target.closest?.('[data-action="close-podcast-category-modal"]')) {
            closeCategoryModal();
            return;
        }
        // Clicking a podcast inside the modal — navigate via stored href.
        const item = target.closest?.('.category-expanded-book') as HTMLElement | null;
        if (item && item.closest?.(`#${MODAL_ID}`)) {
            event.preventDefault();
            const href = item.dataset.href;
            if (href) window.location.href = href;
        }
    });
}

onDomReady(init, 'podcasts-folder-view init');
