// Shared folder-view + stats-toggle infrastructure for projects and
// challenges. Pages call initTaskFolderView(opts) once with their own
// element ids + flight config. Mirrors podcasts-folder-view in shape.

import { tryReadString, tryWrite } from '../lib/storage';
import { trapFocus } from '../lib/focus-trap';
import { flyCover, type CoverFlightConfig } from './cover-flight';

export interface TaskFolderViewOpts {
    listId: string;            // e.g. 'projects-container'
    gridViewId: string;        // e.g. 'projects-category-grid-view'
    toggleId: string;          // e.g. 'projects-view-toggle'
    sidebarId?: string;        // e.g. 'projects-sidebar'
    modalId: string;           // e.g. 'project-category-modal'
    modalTitleId: string;
    modalListId: string;
    statsPanelId: string;
    statsBtnSelector: string;
    statsKey: string;          // localStorage key
    toggleActionName: string;  // data-action="..."
    openModalActionName: string;
    closeModalActionName: string;
    cardSelector: string;      // selector for items in listId (e.g. 'a.project-card')
    flightCfg: CoverFlightConfig;
}

export function initTaskFolderView(opts: TaskFolderViewOpts): void {
    let currentMode: 'list' | 'grid' = 'list';
    let releaseModalFocus: (() => void) | null = null;

    const setStatsOpen = (open: boolean) => {
        const panel = document.getElementById(opts.statsPanelId);
        if (!panel) return;
        const btn = document.querySelector<HTMLButtonElement>(opts.statsBtnSelector);
        panel.classList.toggle('collapsed', !open);
        panel.hidden = !open;
        if (btn) {
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.setAttribute('aria-label', open ? 'Hide stats' : 'Show stats');
        }
    };

    const toggleStats = () => {
        const panel = document.getElementById(opts.statsPanelId);
        if (!panel) return;
        const open = panel.hasAttribute('hidden');
        setStatsOpen(open);
        tryWrite(opts.statsKey, open ? '0' : '1');
    };

    const setViewMode = (mode: 'list' | 'grid') => {
        currentMode = mode;
        const list = document.getElementById(opts.listId);
        const grid = document.getElementById(opts.gridViewId);
        const sidebar = opts.sidebarId ? document.getElementById(opts.sidebarId) : null;
        if (list) list.style.display = mode === 'grid' ? 'none' : '';
        if (grid) grid.style.display = mode === 'grid' ? 'block' : 'none';
        if (sidebar) sidebar.style.display = mode === 'grid' ? 'none' : '';
        const btn = document.getElementById(opts.toggleId);
        if (btn) {
            btn.dataset.currentMode = mode;
            const next = mode === 'list' ? 'Switch to category grid view' : 'Switch to list view';
            btn.setAttribute('aria-label', next);
            btn.setAttribute('title', next);
        }
    };

    const openCategoryModal = (category: string) => {
        const modal = document.getElementById(opts.modalId);
        const title = document.getElementById(opts.modalTitleId);
        const container = document.getElementById(opts.modalListId);
        if (!modal || !title || !container) return;
        title.textContent = category;
        const cards = Array.from(document.querySelectorAll(`#${opts.listId} ${opts.cardSelector}`));
        // TaskCard packs multiple tokens into data-category (e.g.
        // "active software"), so check membership rather than equality.
        const matching = cards.filter((c) => {
            const cats = ((c as HTMLElement).dataset.category || '').split(/\s+/);
            return cats.includes(category);
        });
        const fragment = document.createDocumentFragment();
        matching.forEach((card) => {
            const img = card.querySelector('img');
            if (!img) return;
            const item = document.createElement('div');
            item.className = 'category-expanded-book';
            item.setAttribute('role', 'button');
            item.tabIndex = 0;
            item.setAttribute('aria-label', card.getAttribute('aria-label') || '');
            const cardHref = card.getAttribute('href');
            if (cardHref) item.dataset.href = cardHref;
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
    };

    const closeCategoryModal = () => {
        const modal = document.getElementById(opts.modalId);
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
        releaseModalFocus?.();
        releaseModalFocus = null;
    };

    // Stats toggle init.
    const statsBtn = document.querySelector<HTMLButtonElement>(opts.statsBtnSelector);
    if (statsBtn) statsBtn.addEventListener('click', toggleStats);
    setStatsOpen(tryReadString(opts.statsKey) === '0');

    document.addEventListener('click', (event) => {
        const target = event.target as Element | null;
        if (!target) return;
        if (target.closest?.(`[data-action="${opts.toggleActionName}"]`)) {
            event.preventDefault();
            setViewMode(currentMode === 'list' ? 'grid' : 'list');
            return;
        }
        const card = target.closest?.(`[data-action="${opts.openModalActionName}"]`) as HTMLElement | null;
        if (card) {
            openCategoryModal(card.dataset.category || '');
            return;
        }
        if (target.closest?.(`[data-action="${opts.closeModalActionName}"]`)) {
            closeCategoryModal();
            return;
        }
        const item = target.closest?.('.category-expanded-book') as HTMLElement | null;
        if (item && item.closest?.(`#${opts.modalId}`)) {
            event.preventDefault();
            const href = item.dataset.href;
            if (!href) return;
            const cover = item.querySelector('img') as HTMLImageElement | null;
            if (cover) {
                flyCover(cover, href, opts.flightCfg);
                closeCategoryModal();
            } else {
                window.location.href = href;
            }
        }
    });
}
