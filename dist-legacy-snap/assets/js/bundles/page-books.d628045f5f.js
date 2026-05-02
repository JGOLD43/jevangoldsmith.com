
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



/* js/books.js */
// Books page orchestrator. Inlines what used to live in
// js/books-state.js, js/books-filters.js, js/books-modal.js,
// js/books-events.js, js/books-view.js — those shards only ever exported
// JG* globals consumed here, so collapsing them removes 4 globals and
// 5 round-trips through window.

// --- state ---
const booksState = (function createState() {
    const state = {
        activeCategory: 'all',
        books: [],
        reReadsFilter: 'all',
        searchQuery: '',
        sidebarCollapsed: true,
        starFilter: 'all',
        viewMode: 'list'
    };
    return {
        clearReReadsFilter() { state.reReadsFilter = 'all'; },
        clearSearchQuery() { state.searchQuery = ''; },
        clearStarFilter() { state.starFilter = 'all'; },
        get() { return { ...state }; },
        getBooks() { return state.books; },
        setActiveCategory(c) { state.activeCategory = c || 'all'; },
        setBooks(b) { state.books = Array.isArray(b) ? b : []; },
        setReReadsFilter(c) { state.reReadsFilter = c; },
        setSearchQuery(q) { state.searchQuery = String(q || '').trim(); },
        setSidebarCollapsed(v) { state.sidebarCollapsed = Boolean(v); },
        setStarFilter(r) { state.starFilter = r; },
        setViewMode(m) { state.viewMode = m || 'list'; }
    };
}());

// --- filters ---
const CATEGORY_MAP = {
    'Advertising and Copywriting': 'advertising',
    'Autobiographies': 'autobiographies',
    'Big Ideas': 'bigideas',
    'Learning': 'learning',
    'Mental Endurance': 'mentalendurance',
    'Out of the Box Thinking': 'outofthebox',
    'Patience and Clear Thinking': 'patience',
    'Persuasion': 'persuasion',
    'Psychology Books': 'psychology',
    'Science': 'science',
    'Storytelling': 'storytelling',
    'Strategy and War': 'strategy',
    'The Great Books': 'greatbooks',
    'Who Am I?': 'whoami'
};
const CATEGORY_NAME_BY_KEY = Object.entries(CATEGORY_MAP).reduce((lookup, [name, key]) => {
    lookup[key] = name;
    return lookup;
}, {});

function filterBooks(books, state) {
    const query = String(state.searchQuery || '').toLowerCase();
    return books.filter((book) => {
        const isUnread = book.read === false;
        const ratingValue = Number(book.rating || 0);
        if (query) {
            const matchesQuery = [book.title, book.author, book.category || '']
                .some((value) => String(value).toLowerCase().includes(query));
            if (!matchesQuery) return false;
        }
        if (state.starFilter !== 'all') {
            if (isUnread || ratingValue <= 0) return false;
            if (ratingValue < Number(state.starFilter)) return false;
        }
        if (state.reReadsFilter !== 'all') {
            if (isUnread) return false;
            if (Number(book.reReads || 0) < Number(state.reReadsFilter)) return false;
        }
        return true;
    });
}

function getBooksForCategory(books, categoryKey) {
    if (categoryKey === 'all') return books;
    const categoryName = CATEGORY_NAME_BY_KEY[categoryKey];
    if (!categoryName) return [];
    return books.filter((book) => book.category === categoryName);
}

function groupBooksByCategory(books) {
    const groups = Object.values(CATEGORY_MAP).reduce((memo, key) => {
        memo[key] = [];
        return memo;
    }, {});
    books.forEach((book) => {
        const categoryKey = CATEGORY_MAP[book.category];
        if (categoryKey && groups[categoryKey]) groups[categoryKey].push(book);
    });
    return groups;
}

// --- modal ---
function createBooksModal({ getCoverUrl }) {
    function close() {
        const modal = document.getElementById('book-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    function open(book) {
        if (!book?.review) return false;
        const modal = document.getElementById('book-modal');
        const modalTitle = document.getElementById('modal-book-title');
        const modalAuthor = document.getElementById('modal-book-author');
        const modalCover = document.getElementById('modal-book-cover');
        const modalRating = document.getElementById('modal-book-rating');
        const modalReview = document.getElementById('modal-book-review');
        if (!modal || !modalTitle || !modalAuthor || !modalCover || !modalRating || !modalReview) return false;
        const isUnread = book.read === false;
        const stars = isUnread ? '' : '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
        const coverUrl = getCoverUrl(book);
        modalTitle.textContent = book.title;
        modalAuthor.textContent = `by ${book.author}${book.year ? ` (${book.year})` : ''}`;
        modalCover.src = coverUrl;
        modalCover.alt = book.title;
        modalCover.onerror = () => { modalCover.hidden = true; };
        modalCover.onload = () => { modalCover.hidden = false; };
        modalRating.textContent = isUnread ? 'To Read' : stars;
        modalReview.textContent = book.review;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        return true;
    }
    return { close, open };
}

// --- view ---
const categoryDisplayNames = {
    'Advertising and Copywriting': 'Advertising',
    'Astral Projection': 'Astral projection',
    'Autobiographies': 'Autobiographies',
    'Big Ideas': 'Big Ideas',
    'Copywriting': 'Copywriting',
    'The Great Books': 'The Great Books',
    'Lee Kuan Yew': 'Lee Kuan Yew',
    'Learning': 'Learning',
    'Mental Endurance': 'Mental Endurance',
    'Out of the Box Thinking': 'Out Of The Box Thinking',
    'Patience and Clear Thinking': 'Patience & Clear Thinking',
    'Persuasion': 'Persuasion',
    'Psychology Books': 'Psychology',
    'Science': 'Science',
    'Storytelling': 'Storytelling',
    'Strategy and War': 'Strategy',
    'Who Am I?': 'Who Am I?'
};

function createBooksView(controller) {
    let currentViewMode = 'list';

    function createBookCard(book) {
        const card = document.createElement('div');
        const isUnread = book.read === false;
        const ratingValue = Number(book.rating || 0);
        const hasRating = !isUnread && ratingValue > 0;
        card.className = 'book-card js-zoom-item';
        card.setAttribute('data-isbn', book.isbn);
        card.setAttribute('data-id', book.isbn || book.title);
        card.setAttribute('data-title', book.title);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer';
        if (isUnread) card.classList.add('is-unread');
        if (book.review) card.classList.add('has-review');

        const stars = hasRating ? '★'.repeat(ratingValue) + '☆'.repeat(5 - ratingValue) : '';
        const coverUrl = controller.getCoverUrl(book);
        const timesRead = Number(book.reReads || 0) + 1;
        let topBadge = '';
        if (isUnread) topBadge = '<div class="to-read-badge">📚 To Read</div>';
        else if (timesRead > 1) topBadge = `<div class="times-read-badge">📖 ${timesRead}x Read</div>`;
        const detailBody = book.review || book.shortDescription || `${book.title} by ${book.author}`;
        const detailLabel = book.review ? 'Review' : 'Notes';
        let zoomLead = `<p class="zoom-detail-lead">${stars}</p>`;
        if (isUnread) zoomLead = '<p class="zoom-detail-lead zoom-detail-unread">To Read</p>';
        else if (!hasRating) zoomLead = '<p class="zoom-detail-lead zoom-detail-unread">Read</p>';

        let ratingBlock;
        if (isUnread) ratingBlock = '<div class="book-rating book-rating-unread">Not yet read</div>';
        else if (!hasRating) ratingBlock = '<div class="book-rating book-rating-unrated">Read</div>';
        else ratingBlock = `<div class="book-rating"><span class="rating-number">${ratingValue}</span> ${stars}</div>`;

        card.innerHTML = `
            ${topBadge}
            <div class="book-cover-wrapper" data-title="${escapeAttr(book.title)}">
                <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" class="book-cover" loading="lazy" decoding="async" data-book-cover-fallback="true">
                <div class="js-zoom-detail" aria-hidden="true">
                    <p class="zoom-detail-kicker">${escapeHTML(book.author)}${book.year ? ' · ' + escapeHTML(book.year) : ''}</p>
                    <p class="zoom-detail-title">${escapeHTML(book.title)}</p>
                    ${zoomLead}
                    <p class="zoom-detail-line"><span>${detailLabel} —</span> ${escapeHTML(detailBody)}</p>
                </div>
            </div>
            <div class="book-info">
                <div class="book-title-row">
                    <h3 class="book-title">${escapeHTML(book.title)}</h3>
                    ${book.year ? `<span class="book-year">${escapeHTML(book.year)}</span>` : ''}
                </div>
                <p class="book-author">by ${escapeHTML(book.author)}</p>
                ${ratingBlock}
                ${book.review ? `<p class="book-description">${escapeHTML(book.shortDescription)}</p>` : ''}
            </div>
        `;
        return card;
    }

    function renderBooks(books) {
        const container = document.getElementById('books-container');
        if (!container) return;
        container.innerHTML = '';
        books.forEach((book) => container.appendChild(createBookCard(book)));
    }

    function renderSidebar(categories) {
        const countAll = document.getElementById('count-all');
        if (countAll) {
            const total = Object.values(categories).reduce((sum, books) => sum + books.length, 0);
            countAll.textContent = total;
        }
        Object.keys(categories).forEach((categoryKey) => {
            const books = categories[categoryKey];
            const countElement = document.getElementById(`count-${categoryKey}`);
            const section = countElement?.closest('.sidebar-section');
            const container = document.getElementById(`category-${categoryKey}`);
            if (countElement) countElement.textContent = books.length;
            if (section) section.style.display = books.length === 0 ? 'none' : 'block';
            if (container) {
                container.innerHTML = books.map((book) => `
                    <a href="#" class="book-link" data-action="book-link" data-book-title="${escapeAttr(book.title)}">
                        <div>${escapeHTML(book.title)}</div>
                        <div class="book-link-author">${escapeHTML(book.author)}</div>
                    </a>
                `).join('');
            }
        });
    }

    function renderCarousel(books) {
        const track = document.getElementById('carousel-track');
        if (!track) return;
        const recentBooks = books.slice(-20).reverse();
        const carouselBooks = [...recentBooks, ...recentBooks];
        track.style.animationDuration = `${recentBooks.length * 3}s`;
        track.innerHTML = carouselBooks.map((book) => {
            const coverUrl = controller.getCoverUrl(book, 'medium');
            return `<img class="carousel-book" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" data-action="carousel-book" data-isbn="${escapeAttr(book.isbn)}" data-remove-on-error="true">`;
        }).join('');
    }

    function scrollToBookByIsbn(isbn) {
        const bookCard = document.querySelector(`[data-isbn="${isbn}"]`);
        if (!bookCard) return;
        window.JGCollectionUI.highlightAndScroll(bookCard, {
            duration: 1000,
            shadow: '0 8px 24px rgba(0,0,0,0.2)'
        });
    }

    function scrollToBookByTitle(bookTitle, event) {
        const bookCards = Array.from(document.querySelectorAll('.book-card'));
        const targetCard = bookCards.find((card) => {
            const titleElement = card.querySelector('.book-title');
            return titleElement?.textContent === bookTitle;
        });
        if (!targetCard) return;
        window.JGCollectionUI.highlightAndScroll(targetCard, {
            activeElement: event?.target?.closest('.book-link'),
            activeSelector: '.book-link'
        });
    }

    function updateBookCount(count, categoryName) {
        const countElement = document.getElementById('book-count');
        const labelElement = document.getElementById('counter-label');
        if (countElement) countElement.textContent = count;
        if (labelElement) {
            labelElement.textContent = categoryName && categoryName !== 'all'
                ? 'Books'
                : 'Total Books';
        }
    }

    function updateReReadsFilterDisplay(value) {
        const slider = document.getElementById('timesread-slider');
        const text = document.getElementById('filter-timesread-text');
        const normalizedValue = value === 'all' ? 0 : Number(value);
        if (slider) slider.value = normalizedValue;
        if (text) {
            text.textContent = normalizedValue > 0
                ? (normalizedValue >= 10 ? '10' : String(normalizedValue))
                : '';
        }
    }

    function updateStarFilterDisplay(value) {
        const stars = document.querySelectorAll('.filter-star');
        const text = document.getElementById('filter-rating-text');
        stars.forEach((star) => {
            const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
            star.classList.remove('full', 'half');
            if (value === 'all') return;
            if (starNumber <= Math.floor(value)) star.classList.add('full');
            else if (starNumber === Math.ceil(value) && value % 1 === 0.5) star.classList.add('half');
        });
        if (text) text.textContent = value === 'all' ? '' : `${value}+`;
    }

    function getBooksByCategory() {
        const categories = {};
        controller.getBooks().forEach((book) => {
            const category = book.category || 'Uncategorized';
            if (!categories[category]) categories[category] = [];
            categories[category].push(book);
        });
        return categories;
    }

    function renderCategoryGrid() {
        const container = document.getElementById('category-grid');
        if (!container) return;
        const booksByCategory = getBooksByCategory();
        const sortedCategories = Object.entries(booksByCategory).sort((a, b) => b[1].length - a[1].length);
        container.innerHTML = sortedCategories.map(([category, books]) => {
            const previewBooks = books.slice(0, 8);
            const displayName = categoryDisplayNames[category] || category;
            const bookCovers = previewBooks.map((book) => {
                const coverUrl = controller.getCoverUrl(book, 'medium');
                return `<img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" loading="lazy" decoding="async" data-remove-on-error="true">`;
            }).join('');
            const emptySlots = Array(Math.max(0, 8 - previewBooks.length))
                .fill('<div class="empty-slot"></div>')
                .join('');
            return `
                <div class="category-card" data-action="open-category-modal" data-category="${escapeAttr(category)}">
                    <div class="category-card-books">
                        ${bookCovers}${emptySlots}
                    </div>
                    <div class="category-card-info">
                        <span class="category-card-name">${escapeHTML(displayName)}</span>
                        <span class="category-card-count">${books.length}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setViewMode(mode) {
        currentViewMode = mode;
        const listBtn = document.getElementById('list-view-btn');
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtnGrid = document.getElementById('list-view-btn-grid');
        const gridBtnGrid = document.getElementById('grid-view-btn-grid');
        const listBtnMain = document.getElementById('list-view-btn-main');
        const gridBtnMain = document.getElementById('grid-view-btn-main');
        const booksMain = document.querySelector('.books-main');
        const categoryGridView = document.getElementById('category-grid-view');
        const sidebar = document.getElementById('books-sidebar');
        const booksLayout = document.getElementById('books-layout');

        if (listBtn) listBtn.classList.toggle('active', mode === 'list');
        if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
        if (listBtnGrid) listBtnGrid.classList.toggle('active', mode === 'list');
        if (gridBtnGrid) gridBtnGrid.classList.toggle('active', mode === 'grid');
        if (listBtnMain) listBtnMain.classList.toggle('active', mode === 'list');
        if (gridBtnMain) gridBtnMain.classList.toggle('active', mode === 'grid');

        if (mode === 'grid') {
            if (booksMain) booksMain.style.display = 'none';
            if (categoryGridView) categoryGridView.style.display = 'block';
            if (sidebar) sidebar.style.display = 'none';
            if (booksLayout) {
                booksLayout.classList.add('grid-view-active');
                booksLayout.classList.remove('sidebar-collapsed');
            }
            renderCategoryGrid();
            return;
        }
        if (booksMain) booksMain.style.display = 'block';
        if (categoryGridView) categoryGridView.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';
        if (booksLayout) booksLayout.classList.remove('grid-view-active');
        if (sidebar?.classList.contains('collapsed')) booksLayout?.classList.add('sidebar-collapsed');
    }

    function openCategoryModal(category) {
        const books = getBooksByCategory()[category] || [];
        const displayName = categoryDisplayNames[category] || category;
        let modal = document.getElementById('category-expanded-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'category-expanded-modal';
            modal.className = 'category-expanded';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="category-modal-backdrop" data-action="close-category-modal"></div>
            <div class="category-modal-content">
                <div class="category-expanded-header">
                    <h2 class="category-expanded-title">${escapeHTML(displayName)}</h2>
                    <button class="category-expanded-close" data-action="close-category-modal">&times;</button>
                </div>
                <div class="category-expanded-books">
                    ${books.map((book) => {
                        const coverUrl = controller.getCoverUrl(book);
                        return `
                            <div class="category-expanded-book" data-action="open-book-from-grid" data-isbn="${escapeAttr(book.isbn)}">
                                <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" data-remove-on-error="true">
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCategoryModal() {
        const modal = document.getElementById('category-expanded-modal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openBookFromGrid(isbn) {
        const book = controller.getBooks().find((entry) => entry.isbn === isbn);
        if (!book) return;
        closeCategoryModal();
        controller.openBookModal(book);
    }

    return {
        closeCategoryModal,
        currentViewMode: () => currentViewMode,
        openBookFromGrid,
        openCategoryModal,
        renderCategoryGrid,
        renderBooks,
        renderCarousel,
        renderSidebar,
        scrollToBookByIsbn,
        scrollToBookByTitle,
        setViewMode,
        updateBookCount,
        updateReReadsFilterDisplay,
        updateStarFilterDisplay
    };
}

// --- events ---
function bindBooksEvents(handlers) {
    const {
        clearSearch, clearStarFilter, closeBookModal, closeCategoryModal,
        handleCategoryToggle, openBookFromGrid, openCategoryModal,
        scrollToBookByIsbn, scrollToBookByTitle, searchBooks,
        setReReadsFilter, setStarFilter, setViewMode,
        toggleListDropdown, toggleSidebar
    } = handlers;
    const helpers = window.JGCollectionHelpers;

    helpers.installImageErrorHandler();
    helpers.installEscapeCloser(closeBookModal);
    helpers.installEscapeCloser(closeCategoryModal);

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('book-modal');
        if (event.target === modal) { closeBookModal(); return; }
        if (event.target.closest('[data-action="close-book-modal"]')) { closeBookModal(); return; }
        if (event.target.closest('[data-action="toggle-sidebar"]')) { toggleSidebar(); return; }
        if (event.target.closest('[data-action="toggle-list-dropdown"]')) { toggleListDropdown(); return; }
        if (event.target.closest('[data-action="clear-search"]')) { clearSearch(); return; }
        if (event.target.closest('[data-action="clear-star-filter"]')) {
            event.preventDefault();
            clearStarFilter();
            return;
        }
        const categoryButton = event.target.closest('.sidebar-category[data-category]');
        if (categoryButton) {
            handleCategoryToggle(categoryButton.dataset.category || 'all', categoryButton);
            return;
        }
        const viewToggle = event.target.closest('[data-action="set-view-mode"]');
        if (viewToggle) { setViewMode(viewToggle.dataset.mode || 'list'); return; }
        const bookLink = event.target.closest('[data-action="book-link"]');
        if (bookLink) { scrollToBookByTitle(bookLink.dataset.bookTitle || '', event); return; }
        const carouselBook = event.target.closest('[data-action="carousel-book"]');
        if (carouselBook) { scrollToBookByIsbn(carouselBook.dataset.isbn || ''); return; }
        const categoryModal = event.target.closest('[data-action="open-category-modal"]');
        if (categoryModal) { openCategoryModal(categoryModal.dataset.category || ''); return; }
        if (event.target.closest('[data-action="close-category-modal"]')) { closeCategoryModal(); return; }
        const openFromGrid = event.target.closest('[data-action="open-book-from-grid"]');
        if (openFromGrid) openBookFromGrid(openFromGrid.dataset.isbn || '');
    });

    document.addEventListener('click', (event) => {
        window.JGCollectionUI.closeDropdownOnOutsideClick('list-dropdown', event);
    });

    const searchInput = document.getElementById('book-search');
    if (searchInput) {
        const debouncedSearch = window.JGCollectionUI.debounce((value) => searchBooks(value), 120);
        searchInput.addEventListener('input', () => debouncedSearch(searchInput.value));
    }

    const slider = document.getElementById('timesread-slider');
    if (slider) {
        slider.addEventListener('input', (event) => {
            const count = Number.parseInt(event.target.value, 10);
            setReReadsFilter(count);
        });
    }

    helpers.bindStarRatingDrag(
        document.getElementById('star-filter-container'),
        setStarFilter,
        { halfStars: true }
    );
}

// --- orchestrator ---
const collectionUi = window.JGCollectionUI;
const dataFetch = window.JGDataFetch;
const booksModal = createBooksModal({ getCoverUrl });
let booksView = null;
let booksRuntime = null;

async function loadBooksData() {
    if (booksState.getBooks().length > 0) return booksState.getBooks();
    const books = await dataFetch.fetchJsonWithFallback(['data/books.generated.json', 'data/books.json']);
    booksState.setBooks(books);
    return books;
}

function getCoverUrl(bookOrIsbn, size = 'large') {
    if (!bookOrIsbn) return null;
    if (typeof bookOrIsbn === 'object') {
        if (size === 'medium' && bookOrIsbn.coverImageMedium) return bookOrIsbn.coverImageMedium;
        if (bookOrIsbn.coverImage) return bookOrIsbn.coverImage;
        bookOrIsbn = bookOrIsbn.isbn;
    }
    const cleanIsbn = String(bookOrIsbn).replace(/[^0-9X]/gi, '');
    return cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size === 'medium' ? 'M' : 'L'}.jpg` : null;
}

function getAllCategoryButton() {
    return document.querySelector('.sidebar-category[data-category="all"]');
}

function getFilteredBooks() {
    return filterBooks(booksState.getBooks(), booksState.get());
}

function flashCategoryArrow(button, isExpanding) {
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) existingArrow.remove();
    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);
    window.setTimeout(() => arrow.remove(), 500);
}

function renderFromState() {
    booksRuntime?.render();
}

function buildCollectionController() {
    booksRuntime = window.JGCollectionRuntime.create({
        getState: () => booksState.get(),
        getFilteredItems: () => getFilteredBooks(),
        getVisibleItems: (filteredBooks, state) => getBooksForCategory(filteredBooks, state.activeCategory),
        groupItems: (filteredBooks) => groupBooksByCategory(filteredBooks),
        renderSidebar: (groups) => booksView?.renderSidebar(groups),
        renderVisibleItems: (visibleBooks) => booksView?.renderBooks(visibleBooks),
        updateCount: (visibleBooks, state) => booksView?.updateBookCount(visibleBooks.length, state.activeCategory),
        updateControls: (state) => {
            booksView?.updateStarFilterDisplay(state.starFilter);
            booksView?.updateReReadsFilterDisplay(state.reReadsFilter);
            collectionUi.toggleClearButton('search-clear-btn', Boolean(state.searchQuery));
        },
        group: {
            allButtonSelector: '.sidebar-category[data-category="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-books'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'book-search',
        storageKey: 'books-sidebar-collapsed',
        layoutId: 'books-layout',
        sidebarId: 'books-sidebar',
        defaultCollapsed: true
    });
}

function searchBooks(query) {
    booksState.setSearchQuery(query);
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function clearSearch() {
    booksRuntime?.clearSearchInput();
    booksState.clearSearchQuery();
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function setStarFilter(rating) {
    booksState.setStarFilter(rating);
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function clearStarFilter() {
    booksState.clearStarFilter();
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function setReReadsFilter(count) {
    if (count === 0) booksState.clearReReadsFilter();
    else booksState.setReReadsFilter(count);
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function toggleBookCategory(category, button) {
    booksRuntime?.toggleGroup({
        value: category,
        button,
        onCollapse: () => { booksState.setActiveCategory('all'); },
        onExpand: () => {
            flashCategoryArrow(button, true);
            booksState.setActiveCategory(category);
        }
    });
}

function toggleSidebar() {
    const isCollapsed = booksRuntime?.toggleSidebar();
    booksState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = booksRuntime?.restoreSidebar();
    booksState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() { booksRuntime?.toggleListDropdown(); }

function setViewMode(mode) {
    booksState.setViewMode(mode);
    booksView?.setViewMode(mode);
}

function scrollToBookByTitle(bookTitle, event) {
    event?.preventDefault();
    booksView?.scrollToBookByTitle(bookTitle, event);
}

function scrollToLinkedBook() {
    const linkedBookTitle = new URLSearchParams(window.location.search).get('book');
    if (!linkedBookTitle) return;
    scrollToBookByTitle(linkedBookTitle);
}

function scrollToBookByIsbn(isbn) { booksView?.scrollToBookByIsbn(isbn); }
function openCategoryModal(category) { booksView?.openCategoryModal(category); }
function closeCategoryModal() { booksView?.closeCategoryModal(); }
function openBookFromGrid(isbn) { booksView?.openBookFromGrid(isbn); }

function initBooksZoom() {
    const booksGrid = document.getElementById('books-container');
    if (!booksGrid || !window.JGGridZoom) return;
    booksGrid.classList.add('js-zoom-grid');
    window.JGGridZoom.init({
        anchorSelector: '.book-cover',
        eventName: 'book_open',
        fillH: 0.48,
        fillW: 0.56,
        grid: booksGrid,
        itemSelector: '.book-card',
        maxScale: 3.4,
        triggerSelector: '.book-card'
    });
}

function showBooksUnavailable() {
    const container = document.getElementById('books-container');
    if (container) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">Books are unavailable right now.</p>';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        buildCollectionController();
        restoreSidebarState();
        await loadBooksData();

        booksView = createBooksView({
            getBooks: () => booksState.getBooks(),
            getCoverUrl,
            openBookModal: booksModal.open
        });

        bindBooksEvents({
            clearSearch,
            clearStarFilter,
            closeBookModal: booksModal.close,
            closeCategoryModal,
            handleCategoryToggle: toggleBookCategory,
            openBookFromGrid,
            openCategoryModal,
            scrollToBookByIsbn,
            scrollToBookByTitle,
            searchBooks,
            setReReadsFilter,
            setStarFilter,
            setViewMode,
            toggleListDropdown,
            toggleSidebar
        });

        booksView?.renderCarousel(booksState.getBooks());
        renderFromState();
        initBooksZoom();
        scrollToLinkedBook();
    } catch (error) {
        console.error(error);
        showBooksUnavailable();
    }
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


