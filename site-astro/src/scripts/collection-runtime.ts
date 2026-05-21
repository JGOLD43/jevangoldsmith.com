// Collection runtime is a config-driven dynamic adapter consumed by every
// collection page (books, podcasts, people, ...). Pages pass the same
// shape with page-specific selectors + render callbacks.

import type { CollectionRuntimeConfig } from './collection-runtime-types';

export type { CollectionRuntimeConfig } from './collection-runtime-types';

// Internal callsites still use AnyObj for the dataset reads + render
// callbacks. The public Cfg is now narrowed.
type Cfg = CollectionRuntimeConfig & Record<string, AnyObj>;

import { registerActions } from './action-dispatcher';
import {
    activateOnly,
    closeDropdownOnOutsideClick as closeDropdownOnOutsideClickShared,
    collapseGroups,
    restoreCollapsedState,
    toggleClearButton as toggleClearButtonShared,
    toggleCollapsedState
} from './collection-ui';
import { init as initGridZoom } from './grid-zoom';

function toArray<T>(value: ArrayLike<T> | Iterable<T> | null | undefined): T[] {
    return Array.from(value || []);
}

function datasetValue(element: HTMLElement | null | undefined, key: string): string {
    return element?.dataset?.[key] || '';
}

function selectorValue(value: unknown): string {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
}

function resolveActionButton(buttonOrEvent: Cfg, selector: string): HTMLElement | null {
    if (buttonOrEvent?.target) return (buttonOrEvent.target as Element).closest(selector) as HTMLElement | null;
    if (buttonOrEvent?.matches?.(selector)) return buttonOrEvent as HTMLElement;
    return null;
}

// Mobile-only tab switch between the sidebar (list) and the grid (cards).
// Registered globally on module import so it fires even on collection pages
// whose runtime instance never calls `init()` (books, movies, ...). The
// layout gets `mobile-list-view`; CSS does the rest.
function switchCollectionViewFromDom(view: string) {
    const layout = document.querySelector('main.collection-layout') as HTMLElement | null;
    if (!layout) return;
    const isList = view === 'list';
    layout.classList.toggle('mobile-list-view', isList);
    layout.querySelectorAll('.collection-mobile-toggle [data-view]').forEach((btn) => {
        const el = btn as HTMLElement;
        const active = el.dataset.view === view;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
}

registerActions({ switchCollectionView: switchCollectionViewFromDom });

// Mobile UX: when the user taps a row inside a sidebar category panel
// (book / movie / essay / podcast link), the matching grid card needs to
// become visible before the page-specific scroll handler runs. Intercept
// in capture phase, flip the layout back to the grid view, then let the
// existing scroll-to-card handlers fire on bubble.
document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target?.closest) return;
    const link = target.closest('.book-link, .movie-link, .essay-link, .podcast-link');
    if (!link) return;
    const layout = document.querySelector('main.collection-layout.mobile-list-view') as HTMLElement | null;
    if (!layout) return;
    switchCollectionViewFromDom('grid');
}, true);

export function createCollectionRuntime(config: CollectionRuntimeConfig) {
    const cfg = config as Cfg;
    const state = {
        category: cfg.defaultCategory || 'all',
        search: ''
    };
    let initialized = false;

    function cards(): HTMLElement[] {
        return toArray(document.querySelectorAll<HTMLElement>(cfg.cardSelector));
    }

    function categoryTokens(card: HTMLElement): string[] {
        const raw = datasetValue(card, cfg.categoryDataset || 'category').toLowerCase();
        if (cfg.categoryMode === 'exact') return [raw];
        return raw.split(/\s+/).filter(Boolean);
    }

    function matchesCategory(card: HTMLElement): boolean {
        if (state.category === 'all') return true;
        return categoryTokens(card).includes(String(state.category).toLowerCase());
    }

    function matchesSearch(card: HTMLElement): boolean {
        const query = state.search.toLowerCase();
        if (!query) return true;
        return datasetValue(card, cfg.searchDataset || 'search').toLowerCase().includes(query);
    }

    function visibleCards(allCards: HTMLElement[] = cards()): HTMLElement[] {
        return allCards.filter((card) => matchesCategory(card) && matchesSearch(card));
    }

    function setActiveButton(button: Element | null | undefined) {
        const buttons = toArray(document.querySelectorAll(cfg.buttonSelector || '.sidebar-category'));
        activateOnly(buttons, button ?? null);
    }

    function allButton() {
        if (cfg.allButtonSelector) return document.querySelector(cfg.allButtonSelector);
        return document.querySelector(`${cfg.buttonSelector || '.sidebar-category'}[data-action-args="all"]`);
    }

    function updateClearButton() {
        if (!cfg.searchClearButtonId) return;
        const displayValue = cfg.searchClearDisplay || 'flex';
        toggleClearButtonShared(cfg.searchClearButtonId, Boolean(state.search), displayValue);
    }

    function updateCount(count: number) {
        if (!cfg.counterId) return;
        const counter = document.getElementById(cfg.counterId);
        if (counter) counter.textContent = String(count);
    }

    function groupButtons() {
        return toArray(document.querySelectorAll(cfg.group?.buttonSelector || cfg.buttonSelector || '.sidebar-category'));
    }

    function resetGrouping() {
        const activeButton = cfg.group?.allButtonSelector
            ? document.querySelector(cfg.group.allButtonSelector)
            : allButton();
        if (cfg.group?.panelSelector) {
            collapseGroups({
                activeButton,
                buttonSelector: cfg.group.buttonSelector,
                panelSelector: cfg.group.panelSelector
            });
            return;
        }
        activateOnly(groupButtons(), activeButton);
    }

    function activateGrouping(button: Element | null | undefined, panel: Element | null = null) {
        if (cfg.group?.panelSelector) {
            collapseGroups({
                activeButton: button ?? null,
                activePanel: panel,
                buttonSelector: cfg.group.buttonSelector,
                panelSelector: cfg.group.panelSelector
            });
            return;
        }
        activateOnly(groupButtons(), button ?? null);
    }

    // Wrap each render hook so a throw in one (e.g. a bad data row, a
    // missing DOM node) degrades gracefully instead of taking the whole
    // page down. Logs with hook name for diagnosis; subsequent hooks run.
    function safe<T>(hookName: string, fn: () => T): T | undefined {
        try { return fn(); }
        catch (err) {
            console.error(`[collection-runtime] ${hookName} threw; continuing.`, err);
            return undefined;
        }
    }

    function renderManaged() {
        const managedState = safe('getState', () => cfg.getState());
        if (managedState === undefined) return [];
        const filteredItems = safe('getFilteredItems', () => cfg.getFilteredItems(managedState)) ?? [];
        const visibleItems = typeof cfg.getVisibleItems === 'function'
            ? (safe('getVisibleItems', () => cfg.getVisibleItems(filteredItems, managedState)) ?? filteredItems)
            : filteredItems;

        if (cfg.renderSidebar && cfg.groupItems) {
            safe('renderSidebar', () => {
                cfg.renderSidebar(cfg.groupItems(filteredItems), managedState);
            });
        }

        safe('renderVisibleItems', () => cfg.renderVisibleItems?.(visibleItems, managedState));
        safe('updateCount', () => cfg.updateCount?.(visibleItems, managedState));
        safe('updateControls', () => cfg.updateControls?.(managedState, filteredItems, visibleItems));
        safe('onRender', () => cfg.onRender?.({ filteredItems, state: managedState, visibleItems }));
        return visibleItems;
    }

    function renderCards() {
        const allCards = cards();
        const visible = visibleCards(allCards);
        const visibleSet = new Set(visible);
        for (const card of allCards) {
            if (cfg.useDisplayStyle) {
                card.style.display = visibleSet.has(card) ? (cfg.visibleDisplay || 'block') : 'none';
            } else {
                card.hidden = !visibleSet.has(card);
            }
        }
        updateCount(visible.length);
        updateClearButton();
        safe('onRender', () => cfg.onRender?.({ allCards, state: { ...state }, visibleCards: visible }));
        return visible;
    }

    function render() {
        if (typeof cfg.getFilteredItems === 'function') return renderManaged();
        return renderCards();
    }

    function filter(category: string, buttonOrEvent?: Cfg) {
        state.category = category || 'all';
        const button = resolveActionButton(buttonOrEvent, cfg.buttonSelector || '.sidebar-category')
            || document.querySelector(`${cfg.buttonSelector || '.sidebar-category'}[data-action-args="${selectorValue(state.category)}"]`)
            || allButton();
        setActiveButton(button);
        return render();
    }

    function search(query: string) {
        state.search = String(query || '').trim();
        if (cfg.resetCategoryOnSearch !== false) {
            state.category = 'all';
            setActiveButton(allButton());
        }
        return render();
    }

    function clearSearchInput() {
        const input = document.getElementById(cfg.searchInputId) as HTMLInputElement | null;
        if (input) input.value = '';
    }

    function clearSearch() {
        state.search = '';
        state.category = 'all';
        clearSearchInput();
        setActiveButton(allButton());
        return render();
    }

    function toggleSidebar() {
        return toggleCollapsedState({
            storageKey: cfg.storageKey,
            layoutId: cfg.layoutId,
            sidebarId: cfg.sidebarId
        });
    }

    // Mobile-only tab switch between sidebar (list) and grid (cards). Thin
    // wrapper that delegates to the standalone helper so the action also
    // works on pages that never call `runtime.init()` (e.g. books).
    const switchCollectionView = switchCollectionViewFromDom;

    function restoreSidebar() {
        if (!cfg.storageKey) return false;
        return restoreCollapsedState({
            storageKey: cfg.storageKey,
            layoutId: cfg.layoutId,
            sidebarId: cfg.sidebarId,
            defaultCollapsed: cfg.defaultCollapsed ?? true
        });
    }

    function toggleListDropdown() {
        document.getElementById(cfg.dropdownId || 'list-dropdown')?.classList.toggle('open');
    }

    function closeDropdownOnOutsideClick(event: Event) {
        closeDropdownOnOutsideClickShared(cfg.dropdownId || 'list-dropdown', event);
    }

    function toggleGroup({ button = null, onCollapse = null, onExpand = null, panel = null, value = 'all' }: { button?: Element | null; onCollapse?: (() => void) | null; onExpand?: (() => void) | null; panel?: Element | null; value?: string }) {
        if (!cfg.group) return render();
        if (cfg.group.panelSelector) {
            const resolvedPanel = panel || cfg.group.panelForValue?.(value) || null;
            const isExpanded = Boolean(resolvedPanel?.classList.contains('expanded'));
            if (value === 'all' || isExpanded) {
                onCollapse?.();
                resetGrouping();
                return render();
            }
            if (!button || !resolvedPanel) return render();
            onExpand?.();
            activateGrouping(button, resolvedPanel);
            return render();
        }
        activateGrouping(button || allButton());
        onExpand?.();
        return render();
    }

    function initZoom() {
        if (!cfg.zoom) return;
        const grid = document.getElementById(cfg.gridId);
        if (!grid) return;
        grid.classList.add('js-zoom-grid');
        initGridZoom({
            grid,
            anchorSelector: cfg.zoom.anchorSelector,
            fillH: cfg.zoom.fillH,
            fillW: cfg.zoom.fillW,
            itemSelector: cfg.zoom.itemSelector || cfg.cardSelector,
            maxScale: cfg.zoom.maxScale,
            triggerSelector: cfg.zoom.triggerSelector || cfg.cardSelector,
            eventName: cfg.zoom.eventName
        });
    }

    function registerRuntimeActions() {
        const actions: Record<string, unknown> = { switchCollectionView };
        if (!cfg.actions) {
            registerActions(actions);
            return;
        }
        if (cfg.actions.clearSearch) actions[cfg.actions.clearSearch] = clearSearch;
        if (cfg.actions.filter) actions[cfg.actions.filter] = filter;
        if (cfg.actions.search) actions[cfg.actions.search] = search;
        if (cfg.actions.toggleDropdown) actions[cfg.actions.toggleDropdown] = toggleListDropdown;
        if (cfg.actions.toggleSidebar) actions[cfg.actions.toggleSidebar] = toggleSidebar;
        registerActions(actions);
    }

    function init() {
        if (initialized) return render();
        initialized = true;
        registerRuntimeActions();
        document.addEventListener('click', closeDropdownOnOutsideClick);
        restoreSidebar();
        const visible = render();
        initZoom();
        return visible;
    }

    return {
        clearSearch,
        clearSearchInput,
        closeDropdownOnOutsideClick,
        filter,
        init,
        render,
        resetGrouping,
        restoreSidebar,
        search,
        state,
        toggleGroup,
        toggleListDropdown,
        toggleSidebar,
        visibleCards
    };
}
