// People-page parallel to the other folder views. Wires up:
// - Stats toggle
// - Grid toggle between standard list and Kindle-style category folders
// - Category modal that shows a 3-col grid of people in that category;
//   clicking a person opens the existing PeopleModal (no cover-flight,
//   because people don't have detail pages).

import { onDomReady } from './dom-ready';
import { tryReadString, tryWrite } from '../lib/storage';
import { trapFocus } from '../lib/focus-trap';

const STATS_PANEL_ID = 'people-stats-panel';
const STATS_BTN = '.people-stats-toggle';
const STATS_KEY = 'people-stats-collapsed';

const LIST_ID = 'people-container';
const GRID_VIEW_ID = 'people-category-grid-view';
const TOGGLE_ID = 'people-view-toggle';
const MODAL_ID = 'people-category-modal';
const MODAL_TITLE_ID = 'people-category-title';
const MODAL_LIST_ID = 'people-category-list';

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
        btn.setAttribute('aria-label', open ? 'Hide people stats' : 'Show people stats');
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
    const sidebar = document.getElementById('people-sidebar');
    if (list) list.style.display = mode === 'grid' ? 'none' : '';
    if (grid) grid.style.display = mode === 'grid' ? 'block' : 'none';
    if (sidebar) sidebar.style.display = mode === 'grid' ? 'none' : '';
    const btn = document.getElementById(TOGGLE_ID);
    if (btn) {
        btn.dataset.currentMode = mode;
        const next = mode === 'list' ? 'Switch to category grid view' : 'Switch to list view';
        btn.setAttribute('aria-label', next);
        btn.setAttribute('title', next);
    }
}

function openCategoryModal(category: string) {
    const modal = document.getElementById(MODAL_ID);
    const title = document.getElementById(MODAL_TITLE_ID);
    const container = document.getElementById(MODAL_LIST_ID);
    if (!modal || !title || !container) return;
    title.textContent = category;
    const cards = Array.from(document.querySelectorAll(`#${LIST_ID} .person-card`));
    const matching = cards.filter((c) => (c as HTMLElement).dataset.category === category);
    const fragment = document.createDocumentFragment();
    matching.forEach((card) => {
        const img = card.querySelector('img') as HTMLImageElement | null;
        const name = (card.querySelector('.person-name')?.textContent || '').trim()
            || (card as HTMLElement).getAttribute('aria-label')
            || '';
        const personId = (card as HTMLElement).dataset.personId || '';
        if (!img || !personId) return;
        const item = document.createElement('div');
        item.className = 'category-expanded-book';
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.setAttribute('aria-label', name);
        item.dataset.personId = personId;
        const cloned = img.cloneNode(true) as HTMLImageElement;
        cloned.removeAttribute('id');
        item.appendChild(cloned);
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
    const statsBtn = document.querySelector<HTMLButtonElement>(STATS_BTN);
    if (statsBtn) statsBtn.addEventListener('click', toggleStats);
    setStatsOpen(tryReadString(STATS_KEY) === '0');

    document.addEventListener('click', (event) => {
        const target = event.target as Element | null;
        if (!target) return;
        if (target.closest?.('[data-action="toggle-people-view-mode"]')) {
            event.preventDefault();
            setViewMode(currentMode === 'list' ? 'grid' : 'list');
            return;
        }
        const card = target.closest?.('[data-action="open-people-category-modal"]') as HTMLElement | null;
        if (card) {
            openCategoryModal(card.dataset.category || '');
            return;
        }
        if (target.closest?.('[data-action="close-people-category-modal"]')) {
            closeCategoryModal();
            return;
        }
        // Clicking a person inside the modal — close the category modal
        // and click the matching card in the listing to open the people
        // modal via the existing handler.
        const item = target.closest?.('.category-expanded-book') as HTMLElement | null;
        if (item && item.closest?.(`#${MODAL_ID}`)) {
            event.preventDefault();
            const personId = item.dataset.personId;
            if (!personId) return;
            const original = document.querySelector(`#${LIST_ID} .person-card[data-person-id="${personId}"]`) as HTMLElement | null;
            closeCategoryModal();
            if (original) requestAnimationFrame(() => original.click());
        }
    });
}

onDomReady(init, 'people-folder-view init');
