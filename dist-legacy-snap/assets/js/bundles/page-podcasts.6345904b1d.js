
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



/* js/podcasts.js */
const dataFetch = window.JGDataFetch;
let podcastRuntime = null;

function escapeValue(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function buildCuratedPodcastCard(podcast) {
    const card = document.createElement('div');
    card.className = `movie-card podcast-card js-zoom-item${podcast.badge ? ' has-review' : ''}`;
    card.dataset.category = podcast.category || 'all';
    card.dataset.search = podcast.searchText || '';
    card.innerHTML = `
        ${podcast.badge ? `<div class="times-read-badge movie-watch-badge">${escapeValue(podcast.badge)}</div>` : ''}
        <div class="movie-poster-wrapper">
            <img src="${escapeValue(podcast.image)}" alt="${escapeValue(podcast.host || podcast.title)}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">
        </div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${escapeValue(podcast.title)}</h3>
            </div>
            <div class="podcast-category-badge">${escapeValue(podcast.host)}</div>
            <p class="movie-description">${escapeValue(podcast.description)}</p>
        </div>
    `;
    return card;
}

async function renderCuratedPodcasts() {
    const data = await dataFetch.fetchJson('data/podcasts.json');
    const podcasts = Array.isArray(data.podcasts) ? data.podcasts : [];
    const container = document.getElementById('podcasts-container');
    if (!container) return;
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    podcasts.forEach((podcast) => fragment.appendChild(buildCuratedPodcastCard(podcast)));
    container.appendChild(fragment);
}

function buildCollectionController() {
    podcastRuntime = window.JGCollectionRuntime.create({
        actions: {
            clearSearch: 'clearPodcastSearch',
            filter: 'filterPodcasts',
            search: 'searchPodcasts',
            toggleDropdown: 'togglePodcastListDropdown',
            toggleSidebar: 'togglePodcastSidebar'
        },
        allButtonSelector: '.sidebar-category[data-podcast-category="all"]',
        buttonSelector: '.sidebar-category',
        cardSelector: '.podcast-card',
        categoryMode: 'exact',
        counterId: 'podcast-count',
        layoutId: 'podcasts-layout',
        searchClearButtonId: 'podcast-search-clear-btn',
        searchInputId: 'podcast-search',
        sidebarId: 'podcasts-sidebar',
        storageKey: 'podcasts-sidebar-collapsed'
    });
}

function formatEpisodeDuration(ms) {
    if (!ms || typeof ms !== 'number' || ms <= 0) return '';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatRelativeDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const day = 86400000;
    if (diffMs < day) return 'today';
    if (diffMs < day * 2) return 'yesterday';
    if (diffMs < day * 7) return `${Math.floor(diffMs / day)} days ago`;
    if (diffMs < day * 30) return `${Math.floor(diffMs / (day * 7))} wk ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildSpotifyEpisodeCard(ep) {
    const card = document.createElement('div');
    card.className = 'movie-card podcast-card js-zoom-item';
    card.dataset.spotify = 'episode';

    const showName = escapeHTML(ep.showName || 'Unknown show');
    const episodeName = escapeHTML(ep.episodeName || 'Untitled episode');
    const duration = escapeHTML(formatEpisodeDuration(ep.durationMs));
    const listenedAt = escapeHTML(formatRelativeDate(ep.listenedAt));
    const image = ep.image
        ? `<img src="${escapeAttr(ep.image)}" alt="${escapeAttr(ep.showName || ep.episodeName || '')}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`
        : `<div class="podcast-cover-placeholder">🎧</div>`;
    const link = ep.episodeUrl
        ? `<a class="spotify-episode-link" href="${escapeAttr(ep.episodeUrl)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`
        : '';

    card.innerHTML = `
        <div class="movie-poster-wrapper">${image}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${episodeName}</h3>
            </div>
            <div class="podcast-category-badge">${showName}</div>
            ${duration ? `<div class="spotify-episode-duration">${duration}${listenedAt ? ` · ${listenedAt}` : ''}</div>` : (listenedAt ? `<div class="spotify-episode-duration">${listenedAt}</div>` : '')}
            ${link}
        </div>
    `;
    return card;
}

function buildSpotifyShowCard(show) {
    const card = document.createElement('div');
    card.className = 'movie-card podcast-card js-zoom-item';
    card.dataset.spotify = 'show';

    const name = escapeHTML(show.name || 'Untitled show');
    const publisher = escapeHTML(show.publisher || '');
    const image = show.image
        ? `<img src="${escapeAttr(show.image)}" alt="${escapeAttr(show.name || '')}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`
        : `<div class="podcast-cover-placeholder">🎙️</div>`;
    const link = show.url
        ? `<a class="spotify-episode-link" href="${escapeAttr(show.url)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`
        : '';

    card.innerHTML = `
        <div class="movie-poster-wrapper">${image}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${name}</h3>
            </div>
            ${publisher ? `<div class="podcast-category-badge">${publisher}</div>` : ''}
            ${link}
        </div>
    `;
    return card;
}

async function loadJSON(url) {
    try {
        return await dataFetch.fetchJson(url);
    } catch {
        return null;
    }
}

function renderSpotifyMeta(elId, generatedAt, count, label) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!count) {
        el.textContent = '';
        return;
    }
    const when = generatedAt ? ` · synced ${formatRelativeDate(generatedAt)}` : '';
    el.textContent = `${count} ${label}${when}`;
}

async function renderSpotifyRecentEpisodes() {
    const data = await loadJSON('data/podcast-episodes.json');
    if (!data || !Array.isArray(data.episodes) || data.episodes.length === 0) return;

    const container = document.getElementById('spotify-recent-container');
    const section = document.getElementById('spotify-recent-section');
    if (!container || !section) return;

    const recent = data.episodes.slice(0, 24);
    const frag = document.createDocumentFragment();
    recent.forEach((ep) => frag.appendChild(buildSpotifyEpisodeCard(ep)));
    container.appendChild(frag);
    section.hidden = false;
    renderSpotifyMeta('spotify-recent-meta', data.generatedAt, recent.length, recent.length === 1 ? 'recent episode' : 'recent episodes');
}

async function renderSpotifyFollowedShows() {
    const data = await loadJSON('data/podcast-shows.json');
    if (!data || !Array.isArray(data.shows) || data.shows.length === 0) return;

    const container = document.getElementById('spotify-shows-container');
    const section = document.getElementById('spotify-shows-section');
    if (!container || !section) return;

    const frag = document.createDocumentFragment();
    data.shows.forEach((show) => frag.appendChild(buildSpotifyShowCard(show)));
    container.appendChild(frag);
    section.hidden = false;
    renderSpotifyMeta('spotify-shows-meta', data.generatedAt, data.shows.length, data.shows.length === 1 ? 'show' : 'shows');
}

document.addEventListener('DOMContentLoaded', async () => {
    buildCollectionController();
    await renderCuratedPodcasts();
    podcastRuntime.init();

    const grid = document.getElementById('podcasts-container');
    if (grid && window.JGGridZoom) {
        grid.classList.add('js-zoom-grid');
        window.JGGridZoom.init({
            grid: grid,
            itemSelector: '.podcast-card',
            triggerSelector: '.podcast-card',
            eventName: 'podcast_open'
        });
    }

    renderSpotifyRecentEpisodes();
    renderSpotifyFollowedShows();
});



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


