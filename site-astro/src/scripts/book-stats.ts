// Tiny toggle for the books stats panel. Mirrors movie-stats.ts but
// scoped to the book-stats-panel + .book-stats-toggle so the two pages
// don't fight each other. The panel content is pre-rendered by
// BookStatsBody.astro at build time; this script just shows/hides it.

import { onDomReady } from './dom-ready';
import { tryReadString, tryWrite } from '../lib/storage';

const PANEL_ID = 'book-stats-panel';
const STORAGE_KEY = 'book-stats-collapsed';
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

function init() {
    if (!document.getElementById(PANEL_ID)) return;
    const btn = document.querySelector<HTMLButtonElement>(BTN_SELECTOR);
    if (btn) btn.addEventListener('click', toggle);
    setOpen(tryReadString(STORAGE_KEY) === '0');
}

onDomReady(init, 'book-stats init');
