// Collection runtime is a config-driven dynamic adapter consumed by every
// collection page (books, podcasts, people, ...). Pages pass the same
// shape with page-specific selectors + render callbacks.

import type {
    CollectionRuntimeConfig,
    CoreCollectionConfig,
    DomCollectionConfig,
    ManagedCollectionConfig
} from './collection-runtime-types';

export type { CollectionRuntimeConfig } from './collection-runtime-types';

type RuntimeState = { category: string; search: string };
type RuntimeActionSource = Event | Element | null | undefined;
type RuntimeConfig =
    CoreCollectionConfig
    & Partial<DomCollectionConfig>
    & Partial<ManagedCollectionConfig<unknown, unknown, unknown, unknown>>;

function isManagedRuntimeConfig(cfg: RuntimeConfig): cfg is RuntimeConfig & Required<Pick<ManagedCollectionConfig<unknown, unknown, unknown, unknown>, 'getState' | 'getFilteredItems'>> {
    return typeof cfg.getFilteredItems === 'function' && typeof cfg.getState === 'function';
}

import type { ActionFn } from './action-dispatcher';
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

function resolveActionButton(buttonOrEvent: RuntimeActionSource, selector: string): HTMLElement | null {
    if (buttonOrEvent instanceof Event) {
        return (buttonOrEvent.target as Element | null)?.closest(selector) as HTMLElement | null;
    }
    if (buttonOrEvent instanceof Element && buttonOrEvent.matches(selector)) return buttonOrEvent as HTMLElement;
    return null;
}

// Mobile-only tab switch between the sidebar (list) and the grid (cards).
// Registered globally on module import so it fires even on collection pages
// whose runtime instance never calls `init()` (books, movies, ...). The
// layout gets `mobile-list-view`; CSS does the rest.
let isMobileCollectionViewTransitioning = false;

function setMovieSearchChromeVisibility(layout: HTMLElement, isSearchView: boolean) {
    if (layout.id !== 'movies-layout') return;
    const sidebar = layout.querySelector<HTMLElement>(':scope > .movies-sidebar');
    const main = layout.querySelector<HTMLElement>(':scope > .movies-main');
    const surfaceProperties = [
        'position', 'z-index', 'top', 'right', 'bottom', 'left', 'width',
        'height', 'min-height', 'margin', 'padding', 'overflow-x', 'overflow-y',
        'backdrop-filter', '-webkit-backdrop-filter', 'background', 'border',
        'border-radius', 'box-shadow'
    ];
    const mainProperties = ['display', 'filter', 'opacity', 'pointer-events'];

    if (isSearchView && sidebar) {
        const isDark = document.documentElement.dataset.theme === 'dark';
        const background = isDark
            ? 'radial-gradient(90% 62% at 8% 0%, #dec57b24 0%, transparent 64%), radial-gradient(75% 54% at 100% 38%, #6d96ca24 0%, transparent 70%), #10121780'
            : 'radial-gradient(85% 58% at 10% 0%, #ffe9aa8a 0%, transparent 65%), radial-gradient(75% 52% at 100% 34%, #b7d8ff75 0%, transparent 70%), #f5f8fb9c';
        const styles: Record<string, string> = {
            position: 'fixed', 'z-index': '20', top: 'var(--nav-height, 70px)',
            right: '0', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            left: '0', width: '100%', height: 'auto', 'min-height': '0', margin: '0',
            padding: '1rem 0 calc(1rem + env(safe-area-inset-bottom, 0px))',
            'overflow-x': 'hidden', 'overflow-y': 'auto',
            'backdrop-filter': 'blur(30px) saturate(155%)',
            '-webkit-backdrop-filter': 'blur(30px) saturate(155%)', background,
            border: '0', 'border-radius': '0', 'box-shadow': 'none'
        };
        Object.entries(styles).forEach(([property, value]) => sidebar.style.setProperty(property, value, 'important'));
        if (main) {
            main.style.setProperty('display', 'block', 'important');
            main.style.setProperty('filter', 'blur(3px) saturate(.78)', 'important');
            main.style.setProperty('opacity', '.6', 'important');
            main.style.setProperty('pointer-events', 'none', 'important');
        }
    } else {
        surfaceProperties.forEach((property) => sidebar?.style.removeProperty(property));
        mainProperties.forEach((property) => main?.style.removeProperty(property));
    }

    layout.querySelectorAll<HTMLElement>(
        ':scope > .movies-sidebar .sidebar-list-selector, :scope > .movies-sidebar .sidebar-footer, :scope > .movies-main .collection-header'
    ).forEach((element) => {
        if (isSearchView) element.style.setProperty('display', 'none', 'important');
        else element.style.removeProperty('display');
    });
}

function setCollectionView(layout: HTMLElement, view: string) {
    const isList = view === 'list';
    layout.classList.toggle('mobile-list-view', isList);
    setMovieSearchChromeVisibility(layout, isList);
    layout.querySelectorAll('.collection-mobile-toggle [data-view]').forEach((btn) => {
        const el = btn as HTMLElement;
        const active = el.dataset.view === view;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
}

function switchCollectionViewFromDom(view: string, shouldAnimate = true) {
    const layout = document.querySelector('main.collection-layout') as HTMLElement | null;
    if (!layout) return;
    const isList = view === 'list';
    if (layout.classList.contains('mobile-list-view') === isList || isMobileCollectionViewTransitioning) return;

    const sidebar = layout.querySelector(':scope > .collection-sidebar') as HTMLElement | null;
    const main = layout.querySelector(':scope > .collection-main, :scope > .books-main, :scope > .movies-main, :scope > .podcasts-main, :scope > .essays-main, :scope > .people-main') as HTMLElement | null;
    const canAnimate = Boolean(
        sidebar
        && main
        && shouldAnimate
        && window.matchMedia('(max-width: 768px) and (prefers-reduced-motion: no-preference)').matches
    );
    if (!canAnimate || !sidebar || !main) {
        setCollectionView(layout, view);
        return;
    }

    const outgoing = isList ? main : sidebar;
    const incoming = isList ? sidebar : main;
    const direction = isList ? -1 : 1;
    isMobileCollectionViewTransitioning = true;
    incoming.style.display = 'block';
    outgoing.style.display = 'block';
    layout.classList.add('is-mobile-view-transitioning');
    layout.style.minHeight = `${Math.max(outgoing.offsetHeight, incoming.offsetHeight)}px`;
    outgoing.style.position = 'absolute';
    outgoing.style.inset = '0 auto auto 0';
    outgoing.style.width = '100%';
    outgoing.style.pointerEvents = 'none';
    setCollectionView(layout, view);

    const options: KeyframeAnimationOptions = {
        duration: 360,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both'
    };
    const outgoingAnimation = outgoing.animate([
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        { opacity: 0, transform: `translate3d(${-direction * 10}%, 0, 0) scale(0.965)` }
    ], options);
    const incomingAnimation = incoming.animate([
        { opacity: 0, transform: `translate3d(${direction * 14}%, 0, 0) scale(0.96)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
    ], options);
    void Promise.all([
        outgoingAnimation.finished.catch(() => undefined),
        incomingAnimation.finished.catch(() => undefined)
    ]).then(() => {
        [outgoing, incoming].forEach((element) => {
            element.style.display = '';
            element.style.position = '';
            element.style.inset = '';
            element.style.width = '';
            element.style.pointerEvents = '';
            element.style.opacity = '';
            element.style.transform = '';
        });
        layout.classList.remove('is-mobile-view-transitioning');
        layout.style.minHeight = '';
        isMobileCollectionViewTransitioning = false;
    });
}

registerActions({ switchCollectionView: switchCollectionViewFromDom as ActionFn });

let mobileSwipeStart: { x: number; y: number; layout: HTMLElement } | null = null;
document.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    const layout = (event.target as Element | null)?.closest?.('main.collection-layout') as HTMLElement | null;
    if (!touch || event.touches.length !== 1 || !layout) return;
    mobileSwipeStart = { x: touch.clientX, y: touch.clientY, layout };
}, { passive: true });

document.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    const start = mobileSwipeStart;
    mobileSwipeStart = null;
    if (!touch || !start || !window.matchMedia('(max-width: 768px)').matches) return;
    const distanceX = touch.clientX - start.x;
    const distanceY = touch.clientY - start.y;
    if (Math.abs(distanceX) < 72 || Math.abs(distanceX) <= Math.abs(distanceY) * 1.35) return;
    switchCollectionViewFromDom(distanceX > 0 ? 'list' : 'grid');
}, { passive: true });

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
    switchCollectionViewFromDom('grid', false);
}, true);

export function createCollectionRuntime(config: CollectionRuntimeConfig) {
    const cfg = config as RuntimeConfig;
    const state = {
        category: cfg.defaultCategory || 'all',
        search: ''
    };
    let initialized = false;

    function cards(): HTMLElement[] {
        if (!cfg.cardSelector) return [];
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
        if (!isManagedRuntimeConfig(cfg)) return [];
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
        safe('onRender', () => cfg.onRender?.({ allCards, state: { ...state } as RuntimeState, visibleCards: visible }));
        return visible;
    }

    function render() {
        if (isManagedRuntimeConfig(cfg)) return renderManaged();
        return renderCards();
    }

    function filter(category: string, buttonOrEvent?: RuntimeActionSource) {
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
            // Special case: the "all" button. Historically clicking it
            // simply reset the active filter and collapsed every panel.
            // If the collection now exposes an `category-all` (or
            // equivalent) panel containing the full item list, we
            // ALSO toggle that panel — so tapping All Books shows a
            // drop-down of every book, the same way tapping a category
            // shows the books in it. Collections without an all-panel
            // (panelForValue returns null) keep the previous behaviour.
            if (value === 'all') {
                onCollapse?.();
                if (isExpanded || !resolvedPanel || !button) {
                    resetGrouping();
                    return render();
                }
                activateGrouping(button, resolvedPanel);
                return render();
            }
            if (isExpanded) {
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
        if (!cfg.gridId) return;
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
        const actions: Record<string, ActionFn> = { switchCollectionView: switchCollectionView as ActionFn };
        if (!cfg.actions) {
            registerActions(actions);
            return;
        }
        if (cfg.actions.clearSearch) actions[cfg.actions.clearSearch] = clearSearch as ActionFn;
        if (cfg.actions.filter) actions[cfg.actions.filter] = filter as ActionFn;
        if (cfg.actions.search) actions[cfg.actions.search] = search as ActionFn;
        if (cfg.actions.toggleDropdown) actions[cfg.actions.toggleDropdown] = toggleListDropdown as ActionFn;
        if (cfg.actions.toggleSidebar) actions[cfg.actions.toggleSidebar] = toggleSidebar as ActionFn;
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
