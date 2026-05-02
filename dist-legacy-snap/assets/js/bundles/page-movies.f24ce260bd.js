
/* js/grid-zoom.js */
(function () {
  'use strict';

  const instances = [];

  function track(name, details) {
    if (window.JGAnalytics && typeof window.JGAnalytics.track === 'function') {
      window.JGAnalytics.track(name, details);
    }
  }

  function apply(grid, item, opts) {
    const gridRect = grid.getBoundingClientRect();
    const anchor = opts && opts.anchorSelector
      ? item.querySelector(opts.anchorSelector) || item
      : item;
    const itemRect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxScale = (opts && opts.maxScale) || 5.6;
    const fillW = (opts && opts.fillW) || 0.82;
    const fillH = (opts && opts.fillH) || 0.72;
    const targetScale = Math.min(
      (vw * fillW) / itemRect.width,
      (vh * fillH) / itemRect.height,
      maxScale
    );
    const gridCx = gridRect.width / 2;
    const gridCy = gridRect.height / 2;
    const itemCxViewport = itemRect.left + itemRect.width / 2;
    const itemCyViewport = itemRect.top + itemRect.height / 2;
    const gridCxViewport = gridRect.left + gridCx;
    const gridCyViewport = gridRect.top + gridCy;
    const originX = gridCx;
    const originY = gridCy;
    const tx = vw / 2 - (gridCxViewport + targetScale * (itemCxViewport - gridCxViewport));
    const ty = vh / 2 - (gridCyViewport + targetScale * (itemCyViewport - gridCyViewport));
    grid.style.setProperty('--origin-x', originX + 'px');
    grid.style.setProperty('--origin-y', originY + 'px');
    grid.style.setProperty('--tx', tx + 'px');
    grid.style.setProperty('--ty', ty + 'px');
    grid.style.setProperty('--scale', String(targetScale));
    grid.classList.add('is-zoomed');
    item.classList.add('is-zoom-target');
    document.body.classList.add('zoom-open');
  }

  function release(grid) {
    grid.style.setProperty('--tx', '0px');
    grid.style.setProperty('--ty', '0px');
    grid.style.setProperty('--scale', '1');
    grid.classList.remove('is-zoomed');
    grid.querySelectorAll('.is-zoom-target').forEach(function (el) {
      el.classList.remove('is-zoom-target');
    });
    document.body.classList.remove('zoom-open');
  }

  function init(config) {
    const grid = typeof config.grid === 'string'
      ? document.querySelector(config.grid)
      : config.grid;
    if (!grid) return null;

    const itemSelector = config.itemSelector || '.zoom-item';
    const triggerSelector = config.triggerSelector || itemSelector;
    const opts = {
      maxScale: config.maxScale,
      fillW: config.fillW,
      fillH: config.fillH,
      anchorSelector: config.anchorSelector
    };
    const eventName = config.eventName || 'zoom_item_open';

    const state = { grid, activeItem: null, itemSelector, triggerSelector, opts };

    function closeActive() {
      if (!state.activeItem) return;
      release(state.grid);
      state.activeItem = null;
    }

    function openItem(item) {
      if (state.activeItem === item) {
        closeActive();
        return;
      }
      if (state.activeItem) release(state.grid);
      state.activeItem = item;
      apply(state.grid, item, state.opts);
      track(eventName, {
        id: item.dataset.id || item.id || '',
        title: item.dataset.title || ''
      });
    }

    grid.addEventListener('click', function (event) {
      if (event.target.closest('.zoom-detail-link, a')) {
        const link = event.target.closest('a');
        if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') return;
      }
      const trigger = event.target.closest(triggerSelector);
      if (!trigger) return;
      const item = trigger.closest(itemSelector) || trigger;
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      openItem(item);
    });

    grid.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = event.target.closest(triggerSelector);
      if (!trigger) return;
      if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/i.test(trigger.tagName)) return;
      const item = trigger.closest(itemSelector) || trigger;
      if (!item) return;
      event.preventDefault();
      openItem(item);
    });

    document.addEventListener('click', function (event) {
      if (!state.activeItem) return;
      if (event.target.closest(itemSelector)) return;
      closeActive();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.activeItem) closeActive();
    });

    window.addEventListener('resize', function () {
      if (state.activeItem) apply(state.grid, state.activeItem, state.opts);
    });

    instances.push(state);
    return {
      release: closeActive,
      refresh: function () {}
    };
  }

  window.JGGridZoom = { init, release: function (grid) { release(grid); } };
}());



/* js/collection-ui.js */
(function () {
    function toggleClearButton(buttonOrId, show, displayValue = 'flex') {
        const button = typeof buttonOrId === 'string'
            ? document.getElementById(buttonOrId)
            : buttonOrId;
        if (!button) return;
        button.style.display = show ? displayValue : 'none';
    }

    function clearClasses(elements, classes) {
        elements.forEach((element) => {
            classes.forEach((className) => element.classList.remove(className));
        });
    }

    function activateOnly(elements, activeElement, classes = ['active']) {
        clearClasses(elements, classes);
        if (!activeElement) return;
        classes.forEach((className) => activeElement.classList.add(className));
    }

    function collapseGroups({ buttonSelector, panelSelector, activeButton = null, activePanel = null }) {
        const buttons = Array.from(document.querySelectorAll(buttonSelector));
        const panels = Array.from(document.querySelectorAll(panelSelector));
        clearClasses(buttons, ['active', 'expanded']);
        clearClasses(panels, ['expanded']);
        if (activeButton) activeButton.classList.add('active');
        if (activePanel) {
            activeButton?.classList.add('expanded');
            activePanel.classList.add('expanded');
        }
    }

    function highlightAndScroll(target, { activeSelector = null, activeElement = null, transform = 'scale(1.05)', shadow = '0 8px 30px rgba(102, 126, 234, 0.3)', duration = 2000 } = {}) {
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.transform = transform;
        target.style.boxShadow = shadow;
        setTimeout(() => {
            target.style.transform = '';
            target.style.boxShadow = '';
        }, duration);

        if (activeSelector) {
            clearClasses(Array.from(document.querySelectorAll(activeSelector)), ['active']);
        }
        activeElement?.classList.add('active');
    }

    function closeDropdownOnOutsideClick(dropdownId, event) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    }

    function setCollapsedState({
        layout,
        sidebar,
        isCollapsed,
        layoutClass = 'sidebar-collapsed',
        sidebarClass = 'collapsed'
    }) {
        layout?.classList.toggle(layoutClass, isCollapsed);
        sidebar?.classList.toggle(sidebarClass, isCollapsed);
        return isCollapsed;
    }

    function restoreCollapsedState({
        storageKey,
        layoutId,
        sidebarId,
        defaultCollapsed = true,
        layoutClass = 'sidebar-collapsed',
        sidebarClass = 'collapsed',
        onChange = null
    }) {
        const layout = document.getElementById(layoutId);
        const sidebar = document.getElementById(sidebarId);
        if (!layout || !sidebar) return false;
        const storedValue = localStorage.getItem(storageKey);
        const isCollapsed = storedValue == null
            ? defaultCollapsed
            : storedValue !== 'false' && storedValue !== '0';
        setCollapsedState({ layout, sidebar, isCollapsed, layoutClass, sidebarClass });
        onChange?.(isCollapsed);
        return isCollapsed;
    }

    function toggleCollapsedState({
        storageKey,
        layoutId,
        sidebarId,
        layoutClass = 'sidebar-collapsed',
        sidebarClass = 'collapsed',
        onChange = null
    }) {
        const layout = document.getElementById(layoutId);
        const sidebar = document.getElementById(sidebarId);
        if (!layout || !sidebar) return false;
        const isCollapsed = !sidebar.classList.contains(sidebarClass);
        setCollapsedState({ layout, sidebar, isCollapsed, layoutClass, sidebarClass });
        localStorage.setItem(storageKey, isCollapsed ? 'true' : 'false');
        onChange?.(isCollapsed);
        return isCollapsed;
    }

    function debounce(fn, wait = 120) {
        let timeoutId = null;
        return function (...args) {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => fn.apply(this, args), wait);
        };
    }

    window.JGCollectionUI = {
        activateOnly,
        closeDropdownOnOutsideClick,
        collapseGroups,
        debounce,
        highlightAndScroll,
        restoreCollapsedState,
        setCollapsedState,
        toggleCollapsedState,
        toggleClearButton
    };
}());



/* js/collection-runtime.js */
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



/* js/collection-helpers.js */
// Cross-collection helpers: image error fallback, star drag handler,
// escape-key closer. Replaces duplicated logic across books/letterboxd/podcasts.
(function () {
    let imageErrorInstalled = false;
    function installImageErrorHandler() {
        if (imageErrorInstalled) return;
        imageErrorInstalled = true;
        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLImageElement)) return;
            if (target.dataset.bookCoverFallback === 'true') {
                target.hidden = true;
                target.parentElement?.classList.add('book-cover-missing');
                return;
            }
            if (target.dataset.removeOnError === 'true') target.remove();
        }, true);
    }

    // Drag-to-rate over .filter-star elements inside `container`.
    // halfStars=true enables 0.5 increments based on click x-position.
    function bindStarRatingDrag(container, onChange, options = {}) {
        if (!container) return;
        const halfStars = Boolean(options.halfStars);
        const stars = Array.from(container.querySelectorAll('.filter-star'));
        let dragging = false;
        function valueFor(star, event) {
            const n = Number.parseInt(star.getAttribute('data-star'), 10);
            if (!halfStars) return n;
            const rect = star.getBoundingClientRect();
            const isLeftHalf = (event.clientX - rect.left) < rect.width / 2;
            return isLeftHalf ? n - 0.5 : n;
        }
        stars.forEach((star) => {
            star.addEventListener('click', (event) => onChange(valueFor(star, event)));
            star.addEventListener('mousedown', (event) => {
                dragging = true;
                onChange(valueFor(star, event));
            });
            star.addEventListener('mouseenter', (event) => {
                if (dragging) onChange(valueFor(star, event));
            });
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    }

    const escapeClosers = [];
    let escapeInstalled = false;
    function installEscapeCloser(closer) {
        if (typeof closer === 'function') escapeClosers.push(closer);
        if (escapeInstalled) return;
        escapeInstalled = true;
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            escapeClosers.forEach((fn) => { try { fn(); } catch (_) { /* swallow */ } });
        });
    }

    window.JGCollectionHelpers = {
        bindStarRatingDrag,
        installEscapeCloser,
        installImageErrorHandler
    };
}());



/* js/data-fetch.js */
(function () {
    const manifestUrl = '/data/runtime-data-manifest.json';
    let manifestPromise = null;

    function isJsonPath(url) {
        return /\.json(?:$|\?)/i.test(url);
    }

    function relativeAssetPath(url) {
        try {
            const absolute = new URL(url, window.location.origin);
            return absolute.pathname.replace(/^\/+/, '');
        } catch {
            return String(url || '').replace(/^\/+/, '');
        }
    }

    async function loadManifest() {
        if (!manifestPromise) {
            manifestPromise = fetch(manifestUrl, { cache: 'default' })
                .then((response) => response.ok ? response.json() : { assets: {} })
                .catch(() => ({ assets: {} }));
        }
        return manifestPromise;
    }

    async function versionedUrl(url) {
        if (!url || /^https?:\/\//i.test(url) || !isJsonPath(url)) return url;
        const manifest = await loadManifest();
        const assetPath = relativeAssetPath(url.split('#')[0]);
        const version = manifest.assets?.[assetPath];
        if (!version) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${version}`;
    }

    async function fetchJson(url, options = {}) {
        const target = await versionedUrl(url);
        const response = await fetch(target, {
            cache: options.cache || 'default'
        });
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return response.json();
    }

    async function fetchJsonWithFallback(urls, options = {}) {
        let lastError = null;
        for (const url of urls) {
            try {
                return await fetchJson(url, options);
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('Failed to load JSON');
    }

    window.JGDataFetch = {
        fetchJson,
        fetchJsonWithFallback,
        versionedUrl
    };
}());



/* js/action-dispatcher.js */
(function () {
    const registry = Object.create(null);

    function register(actions) {
        Object.assign(registry, actions || {});
    }

    function resolveAction(name) {
        return registry[name] || window[name];
    }

    function defaultEventType(el) {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
        return 'click';
    }

    function parseArgs(raw) {
        if (!raw) return [];
        return raw.split('|').map((value) => decodeURIComponent(value));
    }

    function findActionTarget(event, eventType) {
        if (eventType === 'click') {
            return event.target.closest('[data-action]');
        }
        if (event.target && event.target.matches('[data-action]')) {
            return event.target;
        }
        return null;
    }

    function runAction(event, eventType) {
        const el = findActionTarget(event, eventType);
        if (!el) return;

        const actionEvent = el.dataset.actionEvent || defaultEventType(el);
        if (actionEvent !== eventType) return;

        const fnName = el.dataset.action;
        const fn = resolveAction(fnName);
        if (typeof fn !== 'function') return;

        const args = parseArgs(el.dataset.actionArgs);
        if (el.dataset.actionValue === 'true') args.push(el.value);
        if (el.dataset.actionThis === 'true') args.push(el);
        if (el.dataset.actionEventobj === 'true') args.push(event);

        const result = fn.apply(window, args);
        if (el.dataset.actionPreventDefault === 'true' || result === false) {
            event.preventDefault();
        }
    }

    document.addEventListener('click', function (event) {
        runAction(event, 'click');
    });

    document.addEventListener('input', function (event) {
        runAction(event, 'input');
    });

    document.addEventListener('submit', function (event) {
        runAction(event, 'submit');
    });

    window.JGActions = { register };
}());



/* js/movie-stats.js */
// Compute + render movie watch stats from enriched movie data.
// Exposes window.MovieStats.render(movies) which (re)builds the stats panel.
(function () {
    'use strict';

    const PANEL_ID = 'movie-stats-panel';

    function decadeFor(year) {
        const y = Number(year);
        if (!y) return null;
        return `${Math.floor(y / 10) * 10}s`;
    }

    function safeRating(movie) {
        const n = Number(movie.starCount);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    function watchCount(movie) {
        const n = Number(movie.timesWatched);
        return Number.isFinite(n) && n > 0 ? n : 1;
    }

    function compute(movies) {
        const list = Array.isArray(movies) ? movies : [];
        const filmsWithRuntime = list.filter((m) => Number(m.runtime) > 0);

        const totalFilms = list.length;
        const totalWatches = list.reduce((acc, m) => acc + watchCount(m), 0);
        const totalMinutes = list.reduce(
            (acc, m) => acc + Number(m.runtime || 0) * watchCount(m),
            0
        );
        const avgRuntime = filmsWithRuntime.length
            ? Math.round(
                  filmsWithRuntime.reduce((acc, m) => acc + Number(m.runtime), 0) /
                      filmsWithRuntime.length
              )
            : 0;

        let longest = null;
        let shortest = null;
        for (const m of filmsWithRuntime) {
            if (!longest || Number(m.runtime) > Number(longest.runtime)) longest = m;
            if (!shortest || Number(m.runtime) < Number(shortest.runtime)) shortest = m;
        }

        const hoursByGenre = {};
        for (const m of list) {
            const minutes = Number(m.runtime || 0) * watchCount(m);
            if (minutes <= 0) continue;
            const genre = m.genre || 'Uncategorized';
            hoursByGenre[genre] = (hoursByGenre[genre] || 0) + minutes;
        }

        const filmsByDecade = {};
        for (const m of list) {
            const d = decadeFor(m.year);
            if (!d) continue;
            filmsByDecade[d] = (filmsByDecade[d] || 0) + 1;
        }

        const filmsByRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const m of list) {
            const r = safeRating(m);
            if (r != null) filmsByRating[r] = (filmsByRating[r] || 0) + 1;
        }

        const ratingTotals = {};
        for (const m of list) {
            const r = safeRating(m);
            if (r == null) continue;
            const genre = m.genre || 'Uncategorized';
            if (!ratingTotals[genre]) ratingTotals[genre] = { sum: 0, count: 0 };
            ratingTotals[genre].sum += r;
            ratingTotals[genre].count += 1;
        }
        const avgRatingByGenre = Object.entries(ratingTotals)
            .map(([genre, { sum, count }]) => ({ genre, avg: sum / count, count }))
            .sort((a, b) => b.avg - a.avg);

        const mostRewatched = list
            .filter((m) => watchCount(m) > 1)
            .sort((a, b) => watchCount(b) - watchCount(a))
            .slice(0, 5);

        return {
            totalFilms,
            totalWatches,
            totalMinutes,
            totalHours: Math.round(totalMinutes / 60),
            avgRuntime,
            longest,
            shortest,
            hoursByGenre,
            filmsByDecade,
            filmsByRating,
            avgRatingByGenre,
            mostRewatched,
            enrichedCount: filmsWithRuntime.length
        };
    }

    function escapeHTML(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function fmtRuntime(minutes) {
        const m = Number(minutes) || 0;
        if (m <= 0) return '—';
        const h = Math.floor(m / 60);
        const rem = m % 60;
        if (h === 0) return `${rem}m`;
        if (rem === 0) return `${h}h`;
        return `${h}h ${rem}m`;
    }

    function fmtHours(minutes) {
        const h = minutes / 60;
        if (h >= 100) return `${Math.round(h)} hr`;
        return `${h.toFixed(1)} hr`;
    }

    function bar(label, value, max, suffix) {
        const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
        return `
            <div class="stats-bar-row">
                <span class="stats-bar-label">${escapeHTML(label)}</span>
                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                <span class="stats-bar-value">${escapeHTML(suffix ? `${value} ${suffix}` : String(value))}</span>
            </div>
        `;
    }

    function renderHeadline(stats) {
        return `
            <div class="stats-headline-grid">
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${stats.totalHours.toLocaleString()}</div>
                    <div class="stats-headline-label">Total hours watched</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${stats.totalFilms.toLocaleString()}</div>
                    <div class="stats-headline-label">Films logged</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${stats.totalWatches.toLocaleString()}</div>
                    <div class="stats-headline-label">Total watches</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${fmtRuntime(stats.avgRuntime)}</div>
                    <div class="stats-headline-label">Avg runtime</div>
                </div>
            </div>
        `;
    }

    function renderExtremes(stats) {
        const card = (title, movie) => {
            if (!movie) return '';
            return `
                <div class="stats-extreme-card">
                    <div class="stats-extreme-title">${escapeHTML(title)}</div>
                    <div class="stats-extreme-movie">
                        ${movie.poster ? `<img src="${escapeHTML(movie.poster)}" alt="" class="stats-extreme-poster" loading="lazy" decoding="async">` : ''}
                        <div>
                            <div class="stats-extreme-name">${escapeHTML(movie.title)}</div>
                            <div class="stats-extreme-meta">${escapeHTML(movie.year || '')} · ${escapeHTML(fmtRuntime(movie.runtime))}</div>
                        </div>
                    </div>
                </div>
            `;
        };
        return `
            <div class="stats-extremes">
                ${card('Longest film', stats.longest)}
                ${card('Shortest film', stats.shortest)}
            </div>
        `;
    }

    function renderHoursByGenre(stats) {
        const entries = Object.entries(stats.hoursByGenre).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) return '';
        const max = entries[0][1];
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Hours by genre</h3>
                ${entries.map(([genre, mins]) => bar(genre, fmtHours(mins), max ? mins : 0)).join('')}
            </section>
        `;
    }

    function renderHoursByGenreBars(stats) {
        const entries = Object.entries(stats.hoursByGenre).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) return '';
        const max = entries[0][1];
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Hours by genre</h3>
                ${entries
                    .map(([genre, mins]) => {
                        const pct = max > 0 ? Math.max(2, Math.round((mins / max) * 100)) : 0;
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${escapeHTML(genre)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${escapeHTML(fmtHours(mins))}</span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderFilmsByDecade(stats) {
        const entries = Object.entries(stats.filmsByDecade).sort((a, b) => a[0].localeCompare(b[0]));
        if (entries.length === 0) return '';
        const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Films by decade</h3>
                ${entries
                    .map(([decade, count]) => {
                        const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${escapeHTML(decade)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${count}</span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderRatingHistogram(stats) {
        const entries = [5, 4, 3, 2, 1].map((r) => [r, stats.filmsByRating[r] || 0]);
        const total = entries.reduce((acc, [, v]) => acc + v, 0);
        if (total === 0) return '';
        const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Films by rating</h3>
                ${entries
                    .map(([r, count]) => {
                        const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${'★'.repeat(r)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${count}</span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderAvgRatingByGenre(stats) {
        if (!stats.avgRatingByGenre.length) return '';
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Avg rating by genre</h3>
                ${stats.avgRatingByGenre
                    .map(({ genre, avg, count }) => {
                        const pct = Math.max(2, Math.round((avg / 5) * 100));
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${escapeHTML(genre)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${avg.toFixed(2)}★ <span class="stats-bar-aside">(${count})</span></span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderMostRewatched(stats) {
        if (!stats.mostRewatched.length) return '';
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Most rewatched</h3>
                <ul class="stats-rewatch-list">
                    ${stats.mostRewatched
                        .map(
                            (m) => `
                        <li>
                            <span class="stats-rewatch-count">${watchCount(m)}×</span>
                            <span class="stats-rewatch-title">${escapeHTML(m.title)}</span>
                            <span class="stats-rewatch-year">${escapeHTML(m.year || '')}</span>
                        </li>
                    `
                        )
                        .join('')}
                </ul>
            </section>
        `;
    }

    function renderEmpty(missing) {
        return `
            <div class="stats-empty">
                <p>No runtime data yet. Run <code>npm run enrich:movies</code> with a TMDB API key to populate stats.</p>
                ${missing > 0 ? `<p class="stats-empty-meta">${missing} film${missing === 1 ? '' : 's'} missing runtime.</p>` : ''}
            </div>
        `;
    }

    function render(movies) {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const body = panel.querySelector('.stats-body');
        if (!body) return;

        const stats = compute(movies);
        if (stats.enrichedCount === 0) {
            body.innerHTML = renderEmpty(stats.totalFilms);
            return;
        }

        body.innerHTML = [
            renderHeadline(stats),
            renderExtremes(stats),
            renderHoursByGenreBars(stats),
            renderFilmsByDecade(stats),
            renderRatingHistogram(stats),
            renderAvgRatingByGenre(stats),
            renderMostRewatched(stats)
        ].join('');
    }

    function toggle() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const body = panel.querySelector('.stats-body');
        const btn = panel.querySelector('.stats-toggle');
        const collapsed = panel.classList.toggle('collapsed');
        if (body) body.style.display = collapsed ? 'none' : '';
        if (btn) {
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            btn.setAttribute('aria-label', collapsed ? 'Show stats' : 'Hide stats');
        }
        try {
            localStorage.setItem('movie-stats-collapsed', collapsed ? '1' : '0');
        } catch (_) {
            // ignore storage errors
        }
    }

    function init() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const btn = panel.querySelector('.stats-toggle');
        if (btn) btn.addEventListener('click', toggle);
        let collapsed = false;
        try {
            collapsed = localStorage.getItem('movie-stats-collapsed') === '1';
        } catch (_) {
            // ignore
        }
        if (collapsed) {
            panel.classList.add('collapsed');
            const body = panel.querySelector('.stats-body');
            if (body) body.style.display = 'none';
            if (btn) {
                btn.setAttribute('aria-expanded', 'false');
                btn.setAttribute('aria-label', 'Show stats');
            }
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    window.MovieStats = { render, compute };
})();



/* js/letterboxd.js */
// Movies/letterboxd page orchestrator. Inlines js/letterboxd-state.js,
// js/letterboxd-filters.js, js/letterboxd-modal.js, js/letterboxd-events.js,
// js/letterboxd-render.js, js/letterboxd-view.js — those shards only ever
// exposed window.JGLetterboxd* globals consumed here.

const LETTERBOXD_USERNAME = 'contentwatch';
let linkedMovieHandled = false;
const movieMetadata = {
    'What Dreams May Come': { genre: 'Drama', timesWatched: 1 },
    'Before Sunset': { genre: 'Romance', timesWatched: 1 },
    'Before Sunrise': { genre: 'Romance', timesWatched: 1 },
    'Lawrence of Arabia': { genre: 'Drama', timesWatched: 2 },
    "Breakfast at Tiffany's": { genre: 'Romance', timesWatched: 2 },
    'The Place Beyond the Pines': { genre: 'Drama', timesWatched: 1 }
};

// --- state ---
const movieState = (function createState() {
    const state = {
        activeGenre: 'all',
        movies: [],
        searchQuery: '',
        sidebarCollapsed: true,
        starFilter: 'all',
        timesWatchedFilter: 'all'
    };
    return {
        clearSearchQuery() { state.searchQuery = ''; },
        clearStarFilter() { state.starFilter = 'all'; },
        clearTimesWatchedFilter() { state.timesWatchedFilter = 'all'; },
        get() { return { ...state }; },
        getMovies() { return state.movies; },
        setActiveGenre(g) { state.activeGenre = g || 'all'; },
        setMovies(m) { state.movies = Array.isArray(m) ? m : []; },
        setSearchQuery(q) { state.searchQuery = String(q || '').trim(); },
        setSidebarCollapsed(v) { state.sidebarCollapsed = Boolean(v); },
        setStarFilter(r) { state.starFilter = r; },
        setTimesWatchedFilter(c) { state.timesWatchedFilter = c; }
    };
}());

// --- filters ---
function normalizeGenreKey(genre) {
    return String(genre || 'Uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function filterMoviesData(movies, state) {
    const query = String(state.searchQuery || '').toLowerCase();
    return movies.filter((movie) => {
        if (query) {
            const matchesQuery = [movie.title, movie.genre || '', movie.year ? String(movie.year) : '']
                .some((value) => String(value).toLowerCase().includes(query));
            if (!matchesQuery) return false;
        }
        if (state.starFilter !== 'all' && Number(movie.starCount) < Number(state.starFilter)) return false;
        if (state.timesWatchedFilter !== 'all' && Number(movie.timesWatched) < Number(state.timesWatchedFilter)) return false;
        return true;
    });
}

function getMoviesForGenre(movies, genre) {
    if (genre === 'all') return movies;
    return movies.filter((movie) => movie.genre === genre);
}

function groupMoviesByGenre(movies) {
    return movies.reduce((groups, movie) => {
        const genre = movie.genre || 'Uncategorized';
        if (!groups[genre]) groups[genre] = [];
        groups[genre].push(movie);
        return groups;
    }, {});
}

const movieFilters = {
    filterMovies: filterMoviesData,
    getMoviesForGenre,
    groupMoviesByGenre,
    normalizeGenreKey
};

// --- modal ---
function createMovieModal() {
    function close() {
        const modal = document.getElementById('movie-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    function open(movieData) {
        const modal = document.getElementById('movie-modal');
        if (!modal) return false;
        document.getElementById('modal-movie-title').textContent = movieData.title;
        document.getElementById('modal-movie-year').textContent = movieData.year || '';
        document.getElementById('modal-movie-rating').textContent = movieData.rating || '';
        document.getElementById('modal-movie-date').textContent = `Watched: ${movieData.date}`;
        document.getElementById('modal-movie-review').textContent = movieData.review || 'No review available.';
        document.getElementById('modal-letterboxd-link').href = movieData.link;
        const posterImg = document.getElementById('modal-movie-poster');
        if (movieData.poster) {
            posterImg.src = movieData.poster;
            posterImg.alt = movieData.title;
            posterImg.style.display = 'block';
        } else {
            posterImg.style.display = 'none';
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        return true;
    }
    return { close, open };
}

// --- render ---
const genreIcons = {
    'Action': '💥', 'Adventure': '🗺️', 'Animation': '🎨', 'Comedy': '😂',
    'Crime': '🔫', 'Documentary': '📹', 'Drama': '🎭', 'Fantasy': '🧙',
    'Horror': '👻', 'Mystery': '🔍', 'Romance': '💕', 'Sci-Fi': '🚀',
    'Thriller': '😱', 'Western': '🤠', 'Uncategorized': '🎬'
};

function formatRuntime(minutes) {
    const totalMinutes = Number(minutes) || 0;
    if (totalMinutes <= 0) return '';
    const hours = Math.floor(totalMinutes / 60);
    const remainder = totalMinutes % 60;
    if (hours === 0) return `${remainder} min`;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
}

function normalizeMovieData(movie) {
    const metadata = movieMetadata[movie.title] || {};
    const starCount = Number(movie.starCount || metadata.starCount || 0);
    return {
        title: movie.title || 'Untitled',
        date: movie.date || '',
        link: movie.link || '#',
        rating: movie.rating || (starCount ? `${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}` : null),
        starCount,
        year: movie.year || null,
        poster: movie.poster || null,
        review: movie.review || null,
        shortDescription: movie.shortDescription || null,
        genre: metadata.genre || movie.genre || 'Uncategorized',
        timesWatched: Number(movie.timesWatched || metadata.timesWatched || 1),
        runtime: Number(movie.runtime || 0),
        tmdbId: movie.tmdbId || null,
        tmdbGenres: Array.isArray(movie.tmdbGenres) ? movie.tmdbGenres : [],
        overview: movie.overview || null,
        backdrop: movie.backdrop || null
    };
}

function createMovieCardFromData(movieData) {
    const card = document.createElement('div');
    card.className = 'movie-card js-zoom-item';
    card.setAttribute('data-movie-title', movieData.title);
    card.setAttribute('data-title', movieData.title);
    card.setAttribute('data-id', movieData.title);
    if (movieData.review) {
        card.classList.add('has-review');
        card.style.cursor = 'pointer';
    }
    const timesWatchedBadge = movieData.timesWatched > 1
        ? `<div class="times-read-badge movie-watch-badge">${movieData.timesWatched}x Watched</div>`
        : '';
    const genreIcon = genreIcons[movieData.genre] || '🎬';
    const ratingNumber = movieData.starCount || '';

    const detailHtml = movieData.review ? `
        <div class="js-zoom-detail" aria-hidden="true">
            <p class="zoom-detail-kicker">${escapeHTML(movieData.genre || 'Film')}${movieData.year ? ' · ' + escapeHTML(movieData.year) : ''}</p>
            <p class="zoom-detail-title">${escapeHTML(movieData.title)}</p>
            ${movieData.rating ? `<p class="zoom-detail-lead">${escapeHTML(movieData.rating)}</p>` : ''}
            <p class="zoom-detail-line"><span>Review —</span> ${escapeHTML(movieData.review)}</p>
            ${movieData.date ? `<p class="zoom-detail-line"><span>Watched —</span> ${escapeHTML(movieData.date)}</p>` : ''}
            ${movieData.link && movieData.link !== '#' ? `<a class="zoom-detail-link" href="${escapeAttr(movieData.link)}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
        </div>
    ` : '';

    card.innerHTML = `
        ${timesWatchedBadge}
        <div class="movie-poster-wrapper">
            ${movieData.poster ? `<img src="${escapeAttr(movieData.poster)}" alt="${escapeAttr(movieData.title)}" class="movie-poster" loading="lazy" decoding="async">` : `<div class="movie-poster-placeholder">${escapeHTML(movieData.title)}</div>`}
        </div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${escapeHTML(movieData.title)}</h3>
                ${movieData.year ? `<span class="movie-year">${escapeHTML(movieData.year)}</span>` : ''}
            </div>
            ${movieData.runtime ? `<div class="movie-runtime">${escapeHTML(formatRuntime(movieData.runtime))}</div>` : ''}
            ${movieData.genre ? `<div class="movie-genre-badge">${genreIcon} ${escapeHTML(movieData.genre)}</div>` : ''}
            ${movieData.rating ? `<div class="movie-rating">${ratingNumber ? `<span class="rating-number">${escapeHTML(ratingNumber)}</span>` : ''}${escapeHTML(movieData.rating)}</div>` : ''}
            ${movieData.shortDescription ? `<p class="movie-description">${escapeHTML(movieData.shortDescription)}</p>` : ''}
            ${movieData.date ? `<p class="movie-date">Watched: ${escapeHTML(movieData.date)}</p>` : ''}
        </div>
        ${detailHtml}
    `;
    return card;
}

function displayMovies(movies) {
    const container = document.getElementById('movies-container');
    if (!container) return;
    container.innerHTML = '';
    movies.forEach((movieData) => container.appendChild(createMovieCardFromData(movieData)));
}

function parseMovieData(item) {
    const data = {
        title: item.title,
        date: new Date(item.pubDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        }),
        link: item.link,
        rating: null,
        starCount: 0,
        year: null,
        poster: null,
        review: null,
        shortDescription: null,
        genre: null,
        timesWatched: 1
    };
    const ratingMatch = item.title.match(/★+/);
    if (ratingMatch) {
        const stars = ratingMatch[0].length;
        data.starCount = stars;
        data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    }
    const yearMatch = item.title.match(/,\s*(\d{4})/);
    if (yearMatch) {
        data.year = yearMatch[1];
        data.title = item.title.replace(/,\s*\d{4}.*$/, '').trim();
    }
    const posterMatch = item.description.match(/<img[^>]+src="([^"]+)"/);
    if (posterMatch) data.poster = posterMatch[1];
    const reviewText = item.description
        .replace(/<img[^>]*>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/★+/g, '')
        .replace(/Watched on.*$/i, '')
        .trim();
    if (reviewText.length > 10) {
        data.review = reviewText;
        data.shortDescription = reviewText.length > 150 ? `${reviewText.substring(0, 150)}...` : reviewText;
    }
    const metadata = movieMetadata[data.title] || {};
    data.genre = metadata.genre || item.genre || 'Uncategorized';
    data.timesWatched = metadata.timesWatched || data.timesWatched;
    return data;
}

// --- view ---
function setSidebarLoaded() {
    const loadingSidebar = document.getElementById('loading-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarFooter = document.getElementById('sidebar-footer');
    if (loadingSidebar) loadingSidebar.style.display = 'none';
    if (sidebarContent) sidebarContent.style.display = 'block';
    if (sidebarFooter) sidebarFooter.style.display = 'block';
}

function setMainLoaded() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('movies-container');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'grid';
}

function setError() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
}

function renderSidebar(genreGroups) {
    setSidebarLoaded();
    const countAllEl = document.getElementById('count-all-movies');
    if (countAllEl) {
        const total = Object.values(genreGroups).reduce((sum, movies) => sum + movies.length, 0);
        countAllEl.textContent = total;
    }
    document.querySelectorAll('#sidebar-content .sidebar-section').forEach((section) => {
        const button = section.querySelector('.sidebar-category[data-genre]');
        const genre = button?.dataset.genre;
        if (!genre || genre === 'all') return;
        const key = normalizeGenreKey(genre);
        const countEl = document.getElementById(`count-${key}`);
        const container = document.getElementById(`genre-${key}`);
        if (countEl) countEl.textContent = '0';
        if (container) container.innerHTML = '';
        section.style.display = 'none';
    });
    Object.keys(genreGroups).forEach((genre) => {
        const key = normalizeGenreKey(genre);
        const movies = genreGroups[genre];
        const countEl = document.getElementById(`count-${key}`);
        const section = countEl?.closest('.sidebar-section');
        const container = document.getElementById(`genre-${key}`);
        if (countEl) countEl.textContent = movies.length;
        if (section) section.style.display = movies.length === 0 ? 'none' : 'block';
        if (container) {
            container.innerHTML = movies.map((movie) => `
                <a href="#" class="movie-link" data-action="scrollToMovie" data-action-args="${encodeURIComponent(movie.title)}" data-action-eventobj="true">
                    <div>${escapeHTML(movie.title)}</div>
                    <div class="movie-link-year">${escapeHTML(movie.year || '')}</div>
                </a>
            `).join('');
        }
    });
}

function updateMovieCount(count) {
    const countElement = document.getElementById('movie-count');
    if (countElement) countElement.textContent = count;
}

function updateStarFilterDisplay(value) {
    const stars = document.querySelectorAll('.filter-star');
    const text = document.getElementById('filter-rating-text');
    stars.forEach((star) => {
        const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
        star.classList.remove('full', 'half');
        if (value === 'all') return;
        if (starNumber <= value) star.classList.add('full');
        else if (starNumber === value + 0.5) star.classList.add('half');
    });
    if (text) text.textContent = value === 'all' ? '' : (value >= 5 ? '★' : `${value}★+`);
}

function updateTimesWatchedFilterDisplay(value) {
    const slider = document.getElementById('timeswatched-slider');
    const text = document.getElementById('filter-timeswatched-text');
    const normalized = value === 'all' ? 0 : Number(value);
    if (slider) slider.value = normalized;
    if (text) text.textContent = normalized > 0 ? (normalized >= 10 ? '10' : String(normalized)) : '';
}

function scrollToMovieByTitle(movieTitle, event) {
    const movieCards = Array.from(document.querySelectorAll('.movie-card'));
    const targetCard = movieCards.find((card) => card.getAttribute('data-movie-title') === movieTitle);
    if (!targetCard) return;
    window.JGCollectionUI.highlightAndScroll(targetCard, {
        activeElement: event?.target?.closest('.movie-link'),
        activeSelector: '.movie-link'
    });
}

const movieView = {
    renderSidebar,
    scrollToMovie: scrollToMovieByTitle,
    setError,
    setMainLoaded,
    updateMovieCount,
    updateStarFilterDisplay,
    updateTimesWatchedFilterDisplay
};

const movieRender = {
    createMovieCardFromData,
    displayMovies,
    formatRuntime,
    normalizeMovieData,
    parseMovieData
};

// --- events ---
function bindMovieEvents({ clearTimesWatchedFilter, closeMovieModal, setStarFilter, setTimesWatchedFilter }) {
    const helpers = window.JGCollectionHelpers;
    helpers.installEscapeCloser(closeMovieModal);

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('movie-modal');
        if (event.target === modal) {
            closeMovieModal();
            return;
        }
        window.JGCollectionUI.closeDropdownOnOutsideClick('list-dropdown', event);
    });

    helpers.bindStarRatingDrag(document, setStarFilter);

    const slider = document.getElementById('timeswatched-slider');
    if (slider) {
        slider.addEventListener('input', (event) => {
            const count = Number.parseInt(event.target.value, 10);
            if (count === 0) {
                clearTimesWatchedFilter();
                return;
            }
            setTimesWatchedFilter(count);
        });
    }
}

// --- orchestrator ---
const dataFetch = window.JGDataFetch;
const collectionUi = window.JGCollectionUI;
const movieModal = createMovieModal();
let moviesRuntime = null;

function getFilteredMovies() {
    return movieFilters.filterMovies(movieState.getMovies(), movieState.get());
}

function renderFromState() {
    moviesRuntime?.render();
}

function buildCollectionController() {
    moviesRuntime = window.JGCollectionRuntime.create({
        getState: () => movieState.get(),
        getFilteredItems: () => getFilteredMovies(),
        getVisibleItems: (filteredMovies, state) => movieFilters.getMoviesForGenre(filteredMovies, state.activeGenre),
        groupItems: (filteredMovies) => movieFilters.groupMoviesByGenre(filteredMovies),
        renderSidebar: (groups) => movieView.renderSidebar(groups),
        renderVisibleItems: (visibleMovies) => {
            movieView.setMainLoaded();
            movieRender.displayMovies(visibleMovies);
        },
        updateCount: (visibleMovies) => movieView.updateMovieCount(visibleMovies.length),
        updateControls: (state, filteredMovies) => {
            movieView.updateStarFilterDisplay(state.starFilter);
            movieView.updateTimesWatchedFilterDisplay(state.timesWatchedFilter);
            collectionUi.toggleClearButton('movie-search-clear-btn', Boolean(state.searchQuery));
            if (window.MovieStats && typeof window.MovieStats.render === 'function') {
                window.MovieStats.render(filteredMovies);
            }
        },
        group: {
            allButtonSelector: '[data-genre="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (genre) => genre === 'all' ? null : document.getElementById(`genre-${normalizeGenreKey(genre)}`),
            panelSelector: '.genre-movies'
        },
        searchClearButtonId: 'movie-search-clear-btn',
        searchInputId: 'movie-search',
        storageKey: 'movies-sidebar-collapsed',
        layoutId: 'movies-layout',
        sidebarId: 'movies-sidebar',
        defaultCollapsed: true
    });
}

async function loadCachedMovies() {
    const movies = await dataFetch.fetchJson('data/movies.json');
    if (!Array.isArray(movies) || movies.length === 0) {
        throw new Error('Cached movie data is empty');
    }
    return movies.map(normalizeMovieData);
}

function shouldFetchLiveLetterboxd() {
    return new URLSearchParams(window.location.search).get('source') === 'live';
}

function setMovies(movies) {
    movieState.setMovies(movies.map(normalizeMovieData));
    renderFromState();
    handleLinkedMovie();
}

async function fetchLiveLetterboxdMovies() {
    const rssUrl = `https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Failed to fetch RSS feed');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    if (xmlDoc.querySelector('parsererror')) throw new Error('Error parsing RSS feed');

    const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 20);
    if (items.length === 0) throw new Error('No movies found in feed');

    const movieItems = items.map((item) => {
        const getElementText = (tagName) => {
            const el = item.querySelector(tagName);
            return el ? el.textContent : '';
        };
        const categories = Array.from(item.querySelectorAll('category')).map((cat) => cat.textContent);
        const genre = categories.length > 0 ? categories[0] : 'Uncategorized';
        return {
            description: getElementText('description'),
            genre,
            link: getElementText('link'),
            pubDate: getElementText('pubDate'),
            title: getElementText('title')
        };
    });

    const movies = movieItems
        .filter((item) => item.description && !item.title.includes('created a list'))
        .map(parseMovieData);
    if (movies.length === 0) throw new Error('No watch entries found in feed');
    return movies;
}

async function fetchLetterboxdMovies() {
    try {
        const cachedMovies = await loadCachedMovies();
        setMovies(cachedMovies);
        if (!shouldFetchLiveLetterboxd()) return;
    } catch (cacheError) {
        console.warn('Cached movie data unavailable, trying Letterboxd feed:', cacheError);
    }
    try {
        const liveMovies = await fetchLiveLetterboxdMovies();
        setMovies(liveMovies);
    } catch (error) {
        console.warn('Letterboxd feed unavailable, trying cached movies:', error);
        try {
            const fallbackMovies = await loadCachedMovies();
            setMovies(fallbackMovies);
        } catch (fallbackError) {
            console.error('Error loading movie data:', fallbackError);
            movieView.setError();
        }
    }
}

function searchMovies(query) {
    movieState.setSearchQuery(query);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function clearMovieSearch() {
    moviesRuntime?.clearSearchInput();
    movieState.clearSearchQuery();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function setStarFilter(rating) {
    movieState.setStarFilter(rating);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function clearStarFilter() {
    movieState.clearStarFilter();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function setTimesWatchedFilter(count) {
    movieState.setTimesWatchedFilter(count);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function clearTimesWatchedFilter() {
    movieState.clearTimesWatchedFilter();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function toggleMovieGenre(genre, event) {
    const button = event?.target?.closest('.sidebar-category');
    moviesRuntime?.toggleGroup({
        value: genre,
        button,
        onCollapse: () => { movieState.setActiveGenre('all'); },
        onExpand: () => { movieState.setActiveGenre(genre); }
    });
}

function scrollToMovie(movieTitle, event) {
    event?.preventDefault();
    movieView.scrollToMovie(movieTitle, event);
}

function handleLinkedMovie() {
    if (linkedMovieHandled) return;
    const linkedMovieTitle = new URLSearchParams(window.location.search).get('movie');
    if (!linkedMovieTitle) return;
    linkedMovieHandled = true;
    window.requestAnimationFrame(() => {
        scrollToMovie(linkedMovieTitle);
    });
}

function clearAllFilters() {
    moviesRuntime?.clearSearchInput();
    movieState.clearSearchQuery();
    movieState.clearStarFilter();
    movieState.clearTimesWatchedFilter();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function toggleSidebar() {
    const isCollapsed = moviesRuntime?.toggleSidebar();
    movieState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = moviesRuntime?.restoreSidebar();
    movieState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    moviesRuntime?.toggleListDropdown();
}

function openMovieModal(movieData) {
    movieModal.open(movieData);
}

function closeMovieModal() {
    movieModal.close();
}

function openMovieByTitle(movieTitle) {
    const movie = movieState.getMovies().find((entry) => entry.title === movieTitle && entry.review);
    if (!movie) return;
    openMovieModal(movie);
}

function initMoviesZoom() {
    const moviesGrid = document.getElementById('movies-container');
    if (!moviesGrid || !window.JGGridZoom) return;
    moviesGrid.classList.add('js-zoom-grid');
    window.JGGridZoom.init({
        eventName: 'movie_open',
        grid: moviesGrid,
        itemSelector: '.movie-card.has-review',
        triggerSelector: '.movie-card.has-review'
    });
}

window.JGActions.register({
    clearAllFilters,
    clearMovieSearch,
    closeMovieModal,
    scrollToMovie,
    searchMovies,
    toggleListDropdown,
    toggleMovieGenre,
    toggleSidebar
});

document.addEventListener('DOMContentLoaded', () => {
    buildCollectionController();
    restoreSidebarState();
    bindMovieEvents({
        clearTimesWatchedFilter,
        closeMovieModal,
        setStarFilter,
        setTimesWatchedFilter
    });
    fetchLetterboxdMovies();
    initMoviesZoom();
});



/* js/sanitize.js */
// Shared sanitization utilities for XSS prevention

/**
 * Escape HTML special characters in text strings.
 * Use for ANY text data injected via innerHTML (titles, authors, categories, etc.)
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML content that intentionally contains markup.
 * Use for rich content fields (essay.content, adventure.content, skill.fullContent).
 * Requires DOMPurify to be loaded first.
 */
function sanitizeHTML(html) {
    if (!html) return '';
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
                           'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
                           'img', 'figure', 'figcaption', 'div', 'span', 'hr', 'table', 'thead',
                           'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'mark'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
                           'width', 'height', 'loading', 'decoding'],
            ALLOW_DATA_ATTR: false,
            ADD_ATTR: ['target'],
        });
    }
    // Fallback: strip all tags if DOMPurify not loaded
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/on\w+\s*=/gi, 'data-removed=');
}

/**
 * Escape a string for safe use inside an HTML attribute value.
 * Use when interpolating into onclick, href, data-*, etc.
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Return a safe, escaped URL for href/src-like attributes.
 * Allows http(s), mailto, tel, #hash, and relative paths.
 */
function sanitizeUrl(url, fallback = '#') {
    const raw = String(url || '').trim();
    if (!raw) return fallback;

    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
        return escapeAttr(raw);
    }

    try {
        const parsed = new URL(raw, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
            return escapeAttr(raw);
        }
    } catch {
        return fallback;
    }

    return fallback;
}



/* js/theme.js */
// Theme Toggle and Wisdom Ticker Functionality

(function() {
    'use strict';

    // Theme Toggle
    const THEME_KEY = 'jg-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateToggleButton(theme);
    }

    function updateToggleButton(theme) {
        const btn = document.querySelector('.theme-toggle');
        if (!btn) return;
        const label = btn.querySelector('span');
        if (label) {
            label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }

    // Initialize theme on page load
    function initTheme() {
        const theme = getPreferredTheme();
        setTheme(theme);

        // Add click handler to toggle button
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Wisdom Ticker - Short quotes that cycle through
    // Fallback quotes in case JSON fetch fails
    const fallbackQuotes = [
        "Stay curious, stay humble",
        "Build for decades, not quarters",
        "First principles thinking",
        "Actions reveal priorities",
        "Compound interest in all things",
        "Learn in public",
        "Question assumptions",
        "Simple is harder than complex",
        "The obstacle is the way",
        "Be so good they can't ignore you",
        "Comfort is the enemy of progress"
    ];

    function renderWisdomTicker(quotes) {
        const track = document.querySelector('.wisdom-ticker-track');
        if (!track) return;

        // Shuffle quotes
        const shuffled = [...quotes].sort(() => Math.random() - 0.5);

        // Take first 5 unique items, then add first one at end for seamless loop
        // This creates exactly 6 items to match the CSS animation (6 positions)
        const selected = shuffled.slice(0, 5);
        selected.push(selected[0]);

        // Build HTML with clickable links to quotes page
        track.innerHTML = selected.map(phrase =>
            `<a href="quotes.html" class="wisdom-item">${typeof escapeHTML === 'function' ? escapeHTML(phrase) : phrase}</a>`
        ).join('');
    }

    async function initWisdomTicker() {
        const track = document.querySelector('.wisdom-ticker-track');
        if (!track) return;

        try {
            // Try to fetch quotes from JSON file
            const response = await fetch('data/quotes.json');
            if (response.ok) {
                const data = await response.json();
                // Use tickerQuotes array from JSON
                if (data.tickerQuotes && data.tickerQuotes.length >= 5) {
                    renderWisdomTicker(data.tickerQuotes);
                    return;
                }
            }
        } catch (e) {
            // Fetch failed, use fallback
        }

        // Use fallback quotes if fetch failed
        renderWisdomTicker(fallbackQuotes);
    }

    // Logo video hover effect (lazy-load video source on first interaction)
    function initLogoVideo() {
        const logo = document.querySelector('.logo');
        const video = document.querySelector('.logo-video');
        if (!logo || !video) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let sourceLoaded = false;

        function supportsVideoType(type) {
            return Boolean(video.canPlayType && video.canPlayType(type).replace('no', ''));
        }

        function densityKey() {
            const dpr = window.devicePixelRatio || 1;
            if (dpr >= 2.75) return '3x';
            if (dpr >= 1.5) return '2x';
            return '1x';
        }

        function videoSourceForDisplay() {
            const density = densityKey();
            const webm = video.getAttribute(`data-webm-${density}`);
            const mp4 = video.getAttribute(`data-mp4-${density}`);
            if (webm && supportsVideoType('video/webm; codecs="vp9"')) return webm;
            return mp4 || webm;
        }

        function ensureVideoSource() {
            if (sourceLoaded) return;
            const dataSrc = videoSourceForDisplay();
            if (!dataSrc) return;
            video.src = dataSrc;
            video.preload = 'auto';
            video.load();
            sourceLoaded = true;
        }

        function playVideo() {
            ensureVideoSource();
            if (video.readyState >= 2) {
                video.currentTime = 0;
                video.play().catch(() => {});
                return;
            }
            const playOnReady = () => {
                video.currentTime = 0;
                video.play().catch(() => {});
                video.removeEventListener('canplay', playOnReady);
            };
            video.addEventListener('canplay', playOnReady);
        }

        logo.addEventListener('mouseenter', playVideo);
        logo.addEventListener('mouseleave', () => {
            video.pause();
        });
        logo.addEventListener('touchstart', ensureVideoSource, { passive: true });
    }

    // Mobile Navigation
    function initMobileNav() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        const dropdowns = document.querySelectorAll('.nav-dropdown');

        if (!mobileMenuToggle || !navLinks) return;

        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
            document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
        });

        // Handle dropdown toggles on mobile
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            if (trigger) {
                const handleDropdownClick = (e) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Close other dropdowns
                        dropdowns.forEach(d => {
                            if (d !== dropdown) {
                                d.classList.remove('mobile-dropdown-open');
                            }
                        });
                        dropdown.classList.toggle('mobile-dropdown-open');
                    }
                };
                trigger.addEventListener('click', handleDropdownClick);
                trigger.addEventListener('touchend', (e) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        handleDropdownClick(e);
                    }
                });
            }
        });

        // Close mobile menu when clicking a non-dropdown link
        navLinks.querySelectorAll('a:not(.dropdown-trigger)').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 968) {
                    mobileMenuToggle.classList.remove('active');
                    navLinks.classList.remove('mobile-open');
                    document.body.style.overflow = '';
                    dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
                }
            });
        });

        // Close menu when resizing to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-open');
                document.body.style.overflow = '';
                dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
            }
        });
    }

    // Track navbar height as a CSS variable so sticky sidebars align with the nav
    // regardless of compact/non-compact nav or resize changes.
    function syncNavHeight() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        const h = Math.round(navbar.getBoundingClientRect().height);
        if (h > 0) document.documentElement.style.setProperty('--nav-height', `${h}px`);
    }

    function initNavHeight() {
        syncNavHeight();
        window.addEventListener('resize', syncNavHeight);
        if (window.ResizeObserver) {
            const navbar = document.querySelector('.navbar');
            if (navbar) new ResizeObserver(syncNavHeight).observe(navbar);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            initWisdomTicker();
            initLogoVideo();
            initMobileNav();
            initNavHeight();
        });
    } else {
        initTheme();
        initWisdomTicker();
        initLogoVideo();
        initMobileNav();
        initNavHeight();
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
})();



/* js/analytics.js */
(function () {
  const endpoint = document.querySelector('meta[name="analytics-endpoint"]')?.content || window.JG_ANALYTICS_ENDPOINT || '';
  const queueKey = 'jg_analytics_events';

  function eventPayload(name, details) {
    return {
      name,
      details: details || {},
      path: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString()
    };
  }

  function store(payload) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
      existing.push(payload);
      window.localStorage.setItem(queueKey, JSON.stringify(existing.slice(-50)));
    } catch {
      // Analytics must never affect the public site experience.
    }
  }

  function plausibleName(name) {
    return name.split('_').map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(' ');
  }

  function send(payload) {
    if (window.plausible) {
      window.plausible(plausibleName(payload.name), { props: payload.details });
    }

    if (!endpoint) {
      store(payload);
      return;
    }

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(function () {
      store(payload);
    });
  }

  function track(name, details) {
    const payload = eventPayload(name, details);
    window.dispatchEvent(new CustomEvent('jg:analytics', { detail: payload }));
    send(payload);
  }

  function datasetDetails(element) {
    const details = {};
    for (const key of Object.keys(element.dataset || {})) {
      if (key === 'analytics') continue;
      details[key] = element.dataset[key];
    }
    return details;
  }

  function classifyLink(link) {
    const href = link.getAttribute('href') || '';
    if (link.dataset.analytics) return link.dataset.analytics;
    if (/^mailto:/i.test(href)) return 'contact';
    if (/^https?:\/\//i.test(href) && !href.includes(window.location.hostname)) return 'outbound';
    if (link.matches('.product-cta, .resource-link, .btn-primary, .btn-newsletter, .navbar-contact-btn')) return 'cta';
    if (href.includes('contact.html') || href.includes('meet.html')) return 'contact';
    if (href.includes('products.html')) return 'product';
    if (href.includes('free-resources.html')) return 'resource';
    return '';
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const type = classifyLink(link);
    if (!type) return;

    const eventName = {
      cta: 'cta_click',
      contact: 'contact_click',
      product: 'product_click',
      resource: 'resource_click',
      outbound: 'outbound_click'
    }[type] || 'link_click';

    track(eventName, {
      ...datasetDetails(link),
      type,
      href: link.getAttribute('href'),
      label: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
    });
  });

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (!form || !form.matches('form')) return;
    track(form.matches('[data-newsletter-form]') ? 'newsletter_submit' : 'form_submit', {
      id: form.id || '',
      className: form.className || '',
      action: form.getAttribute('action') || ''
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    track('page_view', {
      title: document.title,
      section: document.body?.dataset?.section || ''
    });
  });

  window.JGAnalytics = { track, flushDebugEvents: function () {
    const events = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
    window.localStorage.removeItem(queueKey);
    return events;
  } };
}());


