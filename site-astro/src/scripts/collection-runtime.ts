// Collection runtime is a config-driven dynamic adapter consumed by every
// collection page (books, podcasts, people, ...). The Config shape varies
// per page (renderers, action names, group helpers), so the public surface
// is intentionally typed as `any` — internal DOM access is narrowed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cfg = any;

import { init as initGridZoom } from './grid-zoom';
import { registerActions } from './action-dispatcher';
import {
    activateOnly,
    closeDropdownOnOutsideClick as closeDropdownOnOutsideClickShared,
    collapseGroups,
    restoreCollapsedState,
    toggleClearButton as toggleClearButtonShared,
    toggleCollapsedState
} from './collection-ui';

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

export function createCollectionRuntime(config: Cfg) {
    const state = {
        category: config.defaultCategory || 'all',
        search: ''
    };
    let initialized = false;

    function cards(): HTMLElement[] {
        return toArray(document.querySelectorAll<HTMLElement>(config.cardSelector));
    }

    function categoryTokens(card: HTMLElement): string[] {
        const raw = datasetValue(card, config.categoryDataset || 'category').toLowerCase();
        if (config.categoryMode === 'exact') return [raw];
        return raw.split(/\s+/).filter(Boolean);
    }

    function matchesCategory(card: HTMLElement): boolean {
        if (state.category === 'all') return true;
        return categoryTokens(card).includes(String(state.category).toLowerCase());
    }

    function matchesSearch(card: HTMLElement): boolean {
        const query = state.search.toLowerCase();
        if (!query) return true;
        return datasetValue(card, config.searchDataset || 'search').toLowerCase().includes(query);
    }

    function visibleCards(allCards: HTMLElement[] = cards()): HTMLElement[] {
        return allCards.filter((card) => matchesCategory(card) && matchesSearch(card));
    }

    function setActiveButton(button: Element | null | undefined) {
        const buttons = toArray(document.querySelectorAll(config.buttonSelector || '.sidebar-category'));
        activateOnly(buttons, button ?? null);
    }

    function allButton() {
        if (config.allButtonSelector) return document.querySelector(config.allButtonSelector);
        return document.querySelector(`${config.buttonSelector || '.sidebar-category'}[data-action-args="all"]`);
    }

    function updateClearButton() {
        if (!config.searchClearButtonId) return;
        const displayValue = config.searchClearDisplay || 'flex';
        toggleClearButtonShared(config.searchClearButtonId, Boolean(state.search), displayValue);
    }

    function updateCount(count: number) {
        if (!config.counterId) return;
        const counter = document.getElementById(config.counterId);
        if (counter) counter.textContent = String(count);
    }

    function groupButtons() {
        return toArray(document.querySelectorAll(config.group?.buttonSelector || config.buttonSelector || '.sidebar-category'));
    }

    function resetGrouping() {
        const activeButton = config.group?.allButtonSelector
            ? document.querySelector(config.group.allButtonSelector)
            : allButton();
        if (config.group?.panelSelector) {
            collapseGroups({
                activeButton,
                buttonSelector: config.group.buttonSelector,
                panelSelector: config.group.panelSelector
            });
            return;
        }
        activateOnly(groupButtons(), activeButton);
    }

    function activateGrouping(button: Element | null | undefined, panel: Element | null = null) {
        if (config.group?.panelSelector) {
            collapseGroups({
                activeButton: button ?? null,
                activePanel: panel,
                buttonSelector: config.group.buttonSelector,
                panelSelector: config.group.panelSelector
            });
            return;
        }
        activateOnly(groupButtons(), button ?? null);
    }

    function renderManaged() {
        const managedState = config.getState();
        const filteredItems = config.getFilteredItems(managedState);
        const visibleItems = typeof config.getVisibleItems === 'function'
            ? config.getVisibleItems(filteredItems, managedState)
            : filteredItems;

        if (config.renderSidebar && config.groupItems) {
            config.renderSidebar(config.groupItems(filteredItems), managedState);
        }

        config.renderVisibleItems?.(visibleItems, managedState);
        config.updateCount?.(visibleItems, managedState);
        config.updateControls?.(managedState, filteredItems, visibleItems);
        config.onRender?.({ filteredItems, state: managedState, visibleItems });
        return visibleItems;
    }

    function renderCards() {
        const allCards = cards();
        const visible = visibleCards(allCards);
        const visibleSet = new Set(visible);
        for (const card of allCards) {
            if (config.useDisplayStyle) {
                card.style.display = visibleSet.has(card) ? (config.visibleDisplay || 'block') : 'none';
            } else {
                card.hidden = !visibleSet.has(card);
            }
        }
        updateCount(visible.length);
        updateClearButton();
        config.onRender?.({ allCards, state: { ...state }, visibleCards: visible });
        return visible;
    }

    function render() {
        if (typeof config.getFilteredItems === 'function') return renderManaged();
        return renderCards();
    }

    function filter(category: string, buttonOrEvent?: Cfg) {
        state.category = category || 'all';
        const button = resolveActionButton(buttonOrEvent, config.buttonSelector || '.sidebar-category')
            || document.querySelector(`${config.buttonSelector || '.sidebar-category'}[data-action-args="${selectorValue(state.category)}"]`)
            || allButton();
        setActiveButton(button);
        return render();
    }

    function search(query: string) {
        state.search = String(query || '').trim();
        if (config.resetCategoryOnSearch !== false) {
            state.category = 'all';
            setActiveButton(allButton());
        }
        return render();
    }

    function clearSearchInput() {
        const input = document.getElementById(config.searchInputId) as HTMLInputElement | null;
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
            storageKey: config.storageKey,
            layoutId: config.layoutId,
            sidebarId: config.sidebarId
        });
    }

    function restoreSidebar() {
        if (!config.storageKey) return false;
        return restoreCollapsedState({
            storageKey: config.storageKey,
            layoutId: config.layoutId,
            sidebarId: config.sidebarId,
            defaultCollapsed: config.defaultCollapsed ?? true
        });
    }

    function toggleListDropdown() {
        document.getElementById(config.dropdownId || 'list-dropdown')?.classList.toggle('open');
    }

    function closeDropdownOnOutsideClick(event: Event) {
        closeDropdownOnOutsideClickShared(config.dropdownId || 'list-dropdown', event);
    }

    function toggleGroup({ button = null, onCollapse = null, onExpand = null, panel = null, value = 'all' }: { button?: Element | null; onCollapse?: (() => void) | null; onExpand?: (() => void) | null; panel?: Element | null; value?: string }) {
        if (!config.group) return render();
        if (config.group.panelSelector) {
            const resolvedPanel = panel || config.group.panelForValue?.(value) || null;
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
        if (!config.zoom) return;
        const grid = document.getElementById(config.gridId);
        if (!grid) return;
        grid.classList.add('js-zoom-grid');
        initGridZoom({
            grid,
            anchorSelector: config.zoom.anchorSelector,
            fillH: config.zoom.fillH,
            fillW: config.zoom.fillW,
            itemSelector: config.zoom.itemSelector || config.cardSelector,
            maxScale: config.zoom.maxScale,
            triggerSelector: config.zoom.triggerSelector || config.cardSelector,
            eventName: config.zoom.eventName
        });
    }

    function registerRuntimeActions() {
        if (!config.actions) return;
        const actions: Record<string, unknown> = {};
        if (config.actions.clearSearch) actions[config.actions.clearSearch] = clearSearch;
        if (config.actions.filter) actions[config.actions.filter] = filter;
        if (config.actions.search) actions[config.actions.search] = search;
        if (config.actions.toggleDropdown) actions[config.actions.toggleDropdown] = toggleListDropdown;
        if (config.actions.toggleSidebar) actions[config.actions.toggleSidebar] = toggleSidebar;
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
