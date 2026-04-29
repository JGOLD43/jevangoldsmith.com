(function () {
    function getById(id) {
        return id ? document.getElementById(id) : null;
    }

    function create({
        getState,
        getFilteredItems,
        getVisibleItems = null,
        renderVisibleItems = null,
        renderSidebar = null,
        groupItems = null,
        updateCount = null,
        updateControls = null,
        onRender = null,
        group = null,
        searchInputId = null,
        searchClearButtonId = null,
        sidebar = null,
        dropdownId = 'list-dropdown'
    }) {
        function allButton() {
            return group?.allButtonSelector ? document.querySelector(group.allButtonSelector) : null;
        }

        function groupButtons() {
            return group?.buttonSelector ? Array.from(document.querySelectorAll(group.buttonSelector)) : [];
        }

        function resetGrouping() {
            if (!group) return;
            const activeButton = allButton();
            if (group.panelSelector) {
                window.JGCollectionUI.collapseGroups({
                    activeButton,
                    buttonSelector: group.buttonSelector,
                    panelSelector: group.panelSelector
                });
                return;
            }
            window.JGCollectionUI.activateOnly(groupButtons(), activeButton);
        }

        function activateGrouping(button, panel = null) {
            if (!group) return;
            if (group.panelSelector) {
                window.JGCollectionUI.collapseGroups({
                    activeButton: button,
                    activePanel: panel,
                    buttonSelector: group.buttonSelector,
                    panelSelector: group.panelSelector
                });
                return;
            }
            window.JGCollectionUI.activateOnly(groupButtons(), button);
        }

        function render() {
            const state = getState();
            const filteredItems = getFilteredItems(state);
            const visibleItems = typeof getVisibleItems === 'function'
                ? getVisibleItems(filteredItems, state)
                : filteredItems;

            if (renderSidebar && groupItems) {
                renderSidebar(groupItems(filteredItems), state);
            }

            renderVisibleItems?.(visibleItems, state);
            updateCount?.(visibleItems, state);
            updateControls?.(state, filteredItems, visibleItems);
            onRender?.({ filteredItems, state, visibleItems });
        }

        function clearSearchInput() {
            const input = getById(searchInputId);
            if (input) input.value = '';
        }

        function syncSearchClearButton(show) {
            if (!searchClearButtonId) return;
            window.JGCollectionUI.toggleClearButton(searchClearButtonId, show);
        }

        function restoreSidebar(onChange = null) {
            if (!sidebar) return false;
            return window.JGCollectionUI.restoreCollapsedState({
                storageKey: sidebar.storageKey,
                layoutId: sidebar.layoutId,
                sidebarId: sidebar.sidebarId,
                defaultCollapsed: sidebar.defaultCollapsed ?? true,
                onChange
            });
        }

        function toggleSidebar(onChange = null) {
            if (!sidebar) return false;
            return window.JGCollectionUI.toggleCollapsedState({
                storageKey: sidebar.storageKey,
                layoutId: sidebar.layoutId,
                sidebarId: sidebar.sidebarId,
                onChange
            });
        }

        function toggleListDropdown() {
            getById(dropdownId)?.classList.toggle('open');
        }

        function closeDropdownOnOutsideClick(event) {
            window.JGCollectionUI.closeDropdownOnOutsideClick(dropdownId, event);
        }

        function toggleGroup({ button = null, onCollapse = null, onExpand = null, panel = null, value = 'all' }) {
            if (!group) return;
            if (group.panelSelector) {
                const resolvedPanel = panel || group.panelForValue?.(value) || null;
                const isExpanded = Boolean(resolvedPanel?.classList.contains('expanded'));
                if (value === 'all' || isExpanded) {
                    onCollapse?.();
                    resetGrouping();
                    render();
                    return;
                }
                if (!button || !resolvedPanel) return;
                onExpand?.();
                activateGrouping(button, resolvedPanel);
                render();
                return;
            }
            activateGrouping(button || allButton());
            onExpand?.();
            render();
        }

        return {
            clearSearchInput,
            closeDropdownOnOutsideClick,
            render,
            resetGrouping,
            restoreSidebar,
            syncSearchClearButton,
            toggleGroup,
            toggleListDropdown,
            toggleSidebar
        };
    }

    window.JGCollectionController = {
        create
    };
}());
