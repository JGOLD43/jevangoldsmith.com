(function () {
    function toArray(value) {
        return Array.from(value || []);
    }

    function datasetValue(element, key) {
        return element?.dataset?.[key] || '';
    }

    function selectorValue(value) {
        if (window.CSS?.escape) return window.CSS.escape(String(value));
        return String(value).replace(/["\\]/g, '\\$&');
    }

    function resolveActionButton(buttonOrEvent, selector) {
        if (buttonOrEvent?.target) return buttonOrEvent.target.closest(selector);
        if (buttonOrEvent?.matches?.(selector)) return buttonOrEvent;
        return null;
    }

    function create(config) {
        const state = {
            category: config.defaultCategory || 'all',
            search: ''
        };
        let initialized = false;

        function cards() {
            return toArray(document.querySelectorAll(config.cardSelector));
        }

        function categoryTokens(card) {
            const raw = datasetValue(card, config.categoryDataset || 'category').toLowerCase();
            if (config.categoryMode === 'exact') return [raw];
            return raw.split(/\s+/).filter(Boolean);
        }

        function matchesCategory(card) {
            if (state.category === 'all') return true;
            return categoryTokens(card).includes(String(state.category).toLowerCase());
        }

        function matchesSearch(card) {
            const query = state.search.toLowerCase();
            if (!query) return true;
            return datasetValue(card, config.searchDataset || 'search').toLowerCase().includes(query);
        }

        function visibleCards(allCards = cards()) {
            return allCards.filter((card) => matchesCategory(card) && matchesSearch(card));
        }

        function setActiveButton(button) {
            const buttons = toArray(document.querySelectorAll(config.buttonSelector || '.sidebar-category'));
            if (window.JGCollectionUI?.activateOnly) {
                window.JGCollectionUI.activateOnly(buttons, button);
                return;
            }
            buttons.forEach((item) => item.classList.remove('active'));
            button?.classList.add('active');
        }

        function allButton() {
            if (config.allButtonSelector) return document.querySelector(config.allButtonSelector);
            return document.querySelector(`${config.buttonSelector || '.sidebar-category'}[data-action-args="all"]`);
        }

        function updateClearButton() {
            if (!config.searchClearButtonId) return;
            const displayValue = config.searchClearDisplay || 'flex';
            if (window.JGCollectionUI?.toggleClearButton) {
                window.JGCollectionUI.toggleClearButton(config.searchClearButtonId, Boolean(state.search), displayValue);
                return;
            }
            const button = document.getElementById(config.searchClearButtonId);
            if (button) button.style.display = state.search ? displayValue : 'none';
        }

        function updateCount(count) {
            if (!config.counterId) return;
            const counter = document.getElementById(config.counterId);
            if (counter) counter.textContent = count;
        }

        function groupButtons() {
            return toArray(document.querySelectorAll(config.group?.buttonSelector || config.buttonSelector || '.sidebar-category'));
        }

        function resetGrouping() {
            const activeButton = config.group?.allButtonSelector
                ? document.querySelector(config.group.allButtonSelector)
                : allButton();
            if (config.group?.panelSelector) {
                window.JGCollectionUI?.collapseGroups({
                    activeButton,
                    buttonSelector: config.group.buttonSelector,
                    panelSelector: config.group.panelSelector
                });
                return;
            }
            if (window.JGCollectionUI?.activateOnly) {
                window.JGCollectionUI.activateOnly(groupButtons(), activeButton);
                return;
            }
            setActiveButton(activeButton);
        }

        function activateGrouping(button, panel = null) {
            if (config.group?.panelSelector) {
                window.JGCollectionUI?.collapseGroups({
                    activeButton: button,
                    activePanel: panel,
                    buttonSelector: config.group.buttonSelector,
                    panelSelector: config.group.panelSelector
                });
                return;
            }
            if (window.JGCollectionUI?.activateOnly) {
                window.JGCollectionUI.activateOnly(groupButtons(), button);
                return;
            }
            setActiveButton(button);
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

        function filter(category, buttonOrEvent) {
            state.category = category || 'all';
            const button = resolveActionButton(buttonOrEvent, config.buttonSelector || '.sidebar-category')
                || document.querySelector(`${config.buttonSelector || '.sidebar-category'}[data-action-args="${selectorValue(state.category)}"]`)
                || allButton();
            setActiveButton(button);
            return render();
        }

        function search(query) {
            state.search = String(query || '').trim();
            if (config.resetCategoryOnSearch !== false) {
                state.category = 'all';
                setActiveButton(allButton());
            }
            return render();
        }

        function clearSearchInput() {
            const input = document.getElementById(config.searchInputId);
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
            if (window.JGCollectionUI?.toggleCollapsedState) {
                return window.JGCollectionUI.toggleCollapsedState({
                    storageKey: config.storageKey,
                    layoutId: config.layoutId,
                    sidebarId: config.sidebarId
                });
            }
            const layout = document.getElementById(config.layoutId);
            const sidebar = document.getElementById(config.sidebarId);
            if (!layout || !sidebar) return false;
            const isCollapsed = !sidebar.classList.contains('collapsed');
            layout.classList.toggle('sidebar-collapsed', isCollapsed);
            sidebar.classList.toggle('collapsed', isCollapsed);
            localStorage.setItem(config.storageKey, isCollapsed ? 'true' : 'false');
            return isCollapsed;
        }

        function restoreSidebar() {
            if (!config.storageKey || !window.JGCollectionUI?.restoreCollapsedState) return false;
            return window.JGCollectionUI.restoreCollapsedState({
                storageKey: config.storageKey,
                layoutId: config.layoutId,
                sidebarId: config.sidebarId,
                defaultCollapsed: config.defaultCollapsed ?? true
            });
        }

        function toggleListDropdown() {
            document.getElementById(config.dropdownId || 'list-dropdown')?.classList.toggle('open');
        }

        function closeDropdownOnOutsideClick(event) {
            if (window.JGCollectionUI?.closeDropdownOnOutsideClick) {
                window.JGCollectionUI.closeDropdownOnOutsideClick(config.dropdownId || 'list-dropdown', event);
                return;
            }
            const dropdown = document.getElementById(config.dropdownId || 'list-dropdown');
            if (dropdown && !dropdown.contains(event.target)) dropdown.classList.remove('open');
        }

        function toggleGroup({ button = null, onCollapse = null, onExpand = null, panel = null, value = 'all' }) {
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
            if (!config.zoom || !window.JGGridZoom) return;
            const grid = document.getElementById(config.gridId);
            if (!grid) return;
            grid.classList.add('js-zoom-grid');
            window.JGGridZoom.init({
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

        function registerActions() {
            if (!config.actions || !window.JGActions) return;
            const actions = {};
            if (config.actions.clearSearch) actions[config.actions.clearSearch] = clearSearch;
            if (config.actions.filter) actions[config.actions.filter] = filter;
            if (config.actions.search) actions[config.actions.search] = search;
            if (config.actions.toggleDropdown) actions[config.actions.toggleDropdown] = toggleListDropdown;
            if (config.actions.toggleSidebar) actions[config.actions.toggleSidebar] = toggleSidebar;
            window.JGActions.register(actions);
        }

        function init() {
            if (initialized) return render();
            initialized = true;
            registerActions();
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

    window.JGCollectionRuntime = { create };
}());
