// Tiny toggle for the books stats panel. Mirrors movie-stats.ts but
// scoped to the book-stats-panel + .book-stats-toggle so the two pages
// don't fight each other. The panel content is pre-rendered by
// BookStatsBody.astro at build time; this script just shows/hides it.

import { onDomReady } from './dom-ready';
import { tryReadString, tryWrite } from '../lib/storage';

const PANEL_ID = 'book-stats-panel';
const STORAGE_KEY = 'book-stats-collapsed';
const TAB_STORAGE_KEY = 'book-stats-tab';
const BTN_SELECTOR = '.book-stats-toggle';

function setOpen(open: boolean) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const btn = document.querySelector<HTMLButtonElement>(BTN_SELECTOR);
    panel.classList.toggle('collapsed', !open);
    panel.hidden = !open;
    if (btn) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Hide reading stats' : 'Show reading stats');
    }
}

function toggle() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const open = panel.hasAttribute('hidden');
    setOpen(open);
    tryWrite(STORAGE_KEY, open ? '0' : '1');
}

function setTab(tab: string) {
    const selected = tab === 'comparison' ? 'comparison' : 'stats';
    document.querySelectorAll<HTMLButtonElement>('[data-book-stats-tab]').forEach((button) => {
        button.setAttribute('aria-selected', button.dataset.bookStatsTab === selected ? 'true' : 'false');
    });
    document.querySelectorAll<HTMLElement>('[data-book-stats-view]').forEach((view) => {
        view.hidden = view.dataset.bookStatsView !== selected;
    });
    tryWrite(TAB_STORAGE_KEY, selected);
}

function init() {
    if (!document.getElementById(PANEL_ID)) return;
    const btn = document.querySelector<HTMLButtonElement>(BTN_SELECTOR);
    if (btn) btn.addEventListener('click', toggle);
    document.querySelectorAll<HTMLButtonElement>('[data-book-stats-tab]').forEach((button) => {
        button.addEventListener('click', () => setTab(button.dataset.bookStatsTab || 'stats'));
    });
    setTab(tryReadString(TAB_STORAGE_KEY) || 'stats');
    setOpen(tryReadString(STORAGE_KEY) === '0');
}

onDomReady(init, 'book-stats init');
