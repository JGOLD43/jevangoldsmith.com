
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



/* js/people.js */
const dataFetch = window.JGDataFetch;

let peopleCards = [];
let peopleRuntime = null;
let peopleById = new Map();
let lastFocusedPerson = null;

const BOOK_PEOPLE = {
    'A Few Lessons for Investors and Managers from Warren Buffett': ['Warren Buffett'],
    'A Few Lessons from Sherlock Holmes': ['Sherlock Holmes'],
    'All I Want to Know is Where I\'m Going to Die So I\'ll Never Go There': ['Charlie Munger'],
    'Atomic Habits': ['James Clear'],
    'Berkshire Hathaway Letters to Shareholders 1965-2023': ['Warren Buffett'],
    'Bird by Bird': ['Anne Lamott'],
    'Can\'t Hurt Me': ['David Goggins'],
    'Confessions of an Advertising Man': ['David Ogilvy'],
    'Damn Right!: Behind the Scenes with Berkshire Hathaway Billionaire Charlie Munger': ['Charlie Munger'],
    'Deep Work': ['Cal Newport'],
    'How to Write a Good Advertisement': ['Victor O. Schwab'],
    'Influence': ['Robert Cialdini'],
    'Letters from John D. Rockefeller to His Son': ['John D. Rockefeller'],
    'Never Enough': ['Andrew Wilkinson'],
    'Ogilvy on Advertising': ['David Ogilvy'],
    'Poor Charlie\'s Almanack': ['Charlie Munger'],
    'Principles': ['Ray Dalio'],
    'Random Reminiscences of Men and Events': ['John D. Rockefeller'],
    'Seeking Wisdom: From Darwin to Munger': ['Charlie Munger'],
    'Surely You\'re Joking, Mr. Feynman!': ['Richard Feynman'],
    'Tao of Charlie Munger': ['Charlie Munger'],
    'The Almanack of Naval Ravikant': ['Naval Ravikant'],
    'The Art of Worldly Wisdom': ['Baltasar Gracián'],
    'The Checklist Manifesto': ['Atul Gawande'],
    'The Great Mental Models': ['Shane Parrish'],
    'The Great Mental Models Volume 1: General Thinking Concepts': ['Shane Parrish'],
    'The Lean Startup': ['Eric Ries'],
    'The Mom Test': ['Rob Fitzpatrick'],
    'The Power of Now': ['Eckhart Tolle'],
    'The Road Less Stupid': ['Keith J. Cunningham'],
    'The Snowball: Warren Buffett and the Business of Life': ['Warren Buffett'],
    'The Ultimate Blueprint for an Insanely Successful Business': ['Keith J. Cunningham'],
    'Titan: The Life of John D. Rockefeller, Sr.': ['John D. Rockefeller'],
    'Zero to One': ['Peter Thiel']
};

const MOVIE_PEOPLE = {
    'Before Sunrise': [
        {
            name: 'Jesse Wallace',
            title: 'Fictional Writer, Before Sunrise',
            lesson: 'Stay awake to the rare conversation in front of you',
            category: 'writers',
            bio: 'Jesse Wallace is a fictional traveler and writer from the Before trilogy, useful as a study in romantic attention, restlessness, and the stories people tell to make sense of their lives.'
        },
        {
            name: 'Céline',
            title: 'Fictional Character, Before Sunrise',
            lesson: 'Meet life with candor and curiosity',
            category: 'creators',
            bio: 'Céline is a fictional character from the Before trilogy whose conversations with Jesse turn ordinary time into a serious inquiry into love, choice, memory, and identity.'
        }
    ],
    'Before Sunset': ['Jesse Wallace', 'Céline'],
    'Breakfast at Tiffany\'s': [
        {
            name: 'Holly Golightly',
            title: 'Fictional Character, Breakfast at Tiffany\'s',
            lesson: 'Charm cannot outrun self-knowledge forever',
            category: 'creators',
            bio: 'Holly Golightly is a fictional New York socialite whose style, evasions, and vulnerability make her a useful character study in reinvention, loneliness, and performance.'
        }
    ],
    'The Place Beyond the Pines': [
        {
            name: 'Luke Glanton',
            title: 'Fictional Character, The Place Beyond the Pines',
            lesson: 'Short-term escape can become inherited consequence',
            category: 'creators',
            bio: 'Luke Glanton is a fictional motorcycle rider whose choices turn personal desperation into a longer chain of family, moral, and generational consequences.'
        }
    ],
    'What Dreams May Come': [
        {
            name: 'Chris Nielsen',
            title: 'Fictional Character, What Dreams May Come',
            lesson: 'Love chooses presence when comfort would leave',
            category: 'creators',
            bio: 'Chris Nielsen is a fictional character whose story frames devotion as an active willingness to enter another person\'s pain rather than merely admire them from safety.'
        }
    ],
    'Lawrence of Arabia': [
        {
            name: 'T. E. Lawrence',
            title: 'Officer, Writer',
            lesson: 'Mythmaking can outrun the person beneath it',
            category: 'business',
            sourceType: 'nonfiction',
            bio: 'T. E. Lawrence was a British officer and writer whose World War I role in the Arab Revolt made him both a historical actor and a case study in charisma, identity, strategy, and myth.'
        }
    ]
};

const GENERATED_PERSON_META = {
    'Andrew Wilkinson': {
        category: 'business',
        lesson: 'Build patiently, own what lasts',
        title: 'Entrepreneur, Investor'
    },
    'Anne Lamott': {
        category: 'writers',
        lesson: 'Write one honest sentence at a time',
        title: 'Writer'
    },
    'Atul Gawande': {
        category: 'science',
        lesson: 'Complex work needs simple checks',
        title: 'Surgeon, Writer'
    },
    'Baltasar Gracián': {
        category: 'writers',
        lesson: 'Wisdom is precision under pressure',
        title: 'Philosopher, Writer'
    },
    'Cal Newport': {
        category: 'writers',
        lesson: 'Protect the depth that compounds',
        title: 'Writer, Computer Scientist'
    },
    'Charlie Munger': {
        category: 'business',
        lesson: 'Collect models, avoid stupidity',
        title: 'Investor, Berkshire Hathaway'
    },
    'David Goggins': {
        category: 'athletes',
        lesson: 'Expand the standard you answer to',
        title: 'Endurance Athlete, Author'
    },
    'David Ogilvy': {
        category: 'creators',
        lesson: 'Sell with research and clarity',
        title: 'Advertising Executive'
    },
    'Eckhart Tolle': {
        category: 'writers',
        lesson: 'Return attention to the present',
        title: 'Spiritual Teacher'
    },
    'Eric Ries': {
        category: 'business',
        lesson: 'Validate before you scale',
        title: 'Entrepreneur, Author'
    },
    'John D. Rockefeller': {
        category: 'business',
        lesson: 'Systemize the machine, then improve it',
        title: 'Founder, Standard Oil'
    },
    'Keith J. Cunningham': {
        category: 'business',
        lesson: 'Think clearly before acting quickly',
        title: 'Entrepreneur, Business Teacher'
    },
    'Peter Thiel': {
        category: 'business',
        lesson: 'Compete by escaping competition',
        title: 'Entrepreneur, Investor'
    },
    'Rob Fitzpatrick': {
        category: 'business',
        lesson: 'Ask questions reality can answer',
        title: 'Entrepreneur, Author'
    },
    'Robert Cialdini': {
        category: 'science',
        lesson: 'Influence follows predictable triggers',
        title: 'Psychologist, Author'
    },
    'Shane Parrish': {
        category: 'writers',
        lesson: 'Make better decisions with better models',
        title: 'Writer, Mental Models Teacher'
    },
    'Sherlock Holmes': {
        category: 'creators',
        lesson: 'Observe before you infer',
        sourceType: 'fiction',
        title: 'Fictional Detective'
    },
    'Victor O. Schwab': {
        category: 'creators',
        lesson: 'Lead with the reader\'s desire',
        title: 'Copywriter'
    }
};

const PERSON_BIOS = {
    'Andrew Wilkinson': 'Andrew Wilkinson is the co-founder of Tiny, a holding company built around buying, operating, and compounding simple internet businesses.',
    'Anne Lamott': 'Anne Lamott is an American novelist and writing teacher whose work is known for its honesty, humor, faith, and practical creative guidance.',
    'Andrew Huberman': 'Andrew Huberman is a Stanford neuroscientist and educator known for making neuroscience, physiology, and behavioral tools useful to a broad audience.',
    'Atul Gawande': 'Atul Gawande is a surgeon, writer, and public health thinker who studies how professionals make complex systems safer and more reliable.',
    'Baltasar Gracián': 'Baltasar Gracián was a Spanish Jesuit philosopher and writer whose aphorisms compress practical wisdom about judgment, reputation, and power.',
    'Cal Newport': 'Cal Newport is a computer science professor and author focused on deep work, attention, skill-building, and the discipline required for meaningful output.',
    'Charlie Munger': 'Charlie Munger was Warren Buffett\'s longtime partner at Berkshire Hathaway and a relentless advocate for multidisciplinary thinking, incentives, and avoiding obvious stupidity.',
    'Christopher Nolan': 'Christopher Nolan is a filmmaker known for large-scale, structurally ambitious movies built around time, memory, obsession, and moral pressure.',
    'David Goggins': 'David Goggins is an endurance athlete and former Navy SEAL known for his extreme mental toughness and self-discipline philosophy.',
    'David Ogilvy': 'David Ogilvy was a legendary advertising executive who helped define modern direct-response and brand advertising through research, clarity, and craft.',
    'Eckhart Tolle': 'Eckhart Tolle is a spiritual teacher and author whose work centers on presence, attention, and loosening identification with thought.',
    'Elon Musk': 'Elon Musk is an entrepreneur and engineer associated with Tesla, SpaceX, and other companies pushing aggressive technology and manufacturing frontiers.',
    'Eric Ries': 'Eric Ries is an entrepreneur and author best known for the Lean Startup method: rapid experimentation, validated learning, and disciplined product iteration.',
    'James Clear': 'James Clear is an author and habits thinker whose work turns behavior change into simple, repeatable systems.',
    'John D. Rockefeller': 'John D. Rockefeller built Standard Oil into one of history\'s most powerful companies and became a defining figure in American business, monopoly, and philanthropy.',
    'Keith J. Cunningham': 'Keith J. Cunningham is an entrepreneur and business teacher focused on judgment, financial discipline, and asking better questions before acting.',
    'Lex Fridman': 'Lex Fridman is an AI researcher and long-form interviewer known for conversations about technology, science, philosophy, and human nature.',
    'Morgan Housel': 'Morgan Housel is a writer and investor known for explaining money, risk, behavior, and long-term decision-making through clear stories.',
    'Naval Ravikant': 'Naval Ravikant is an entrepreneur, investor, and thinker known for compact ideas about leverage, judgment, wealth, happiness, and independence.',
    'Peter Thiel': 'Peter Thiel is an entrepreneur and investor known for PayPal, Palantir, Founders Fund, and contrarian ideas about monopoly and startups.',
    'Ray Dalio': 'Ray Dalio founded Bridgewater Associates and is known for principles-based management, macro investing, and systematic decision-making.',
    'Richard Feynman': 'Richard Feynman was a Nobel Prize-winning physicist celebrated for curiosity, clear explanation, playful problem-solving, and scientific honesty.',
    'Rick Rubin': 'Rick Rubin is a music producer known for stripping work down to its essence and helping artists find what feels true.',
    'Rob Fitzpatrick': 'Rob Fitzpatrick is an entrepreneur and author who teaches practical customer discovery and how to ask questions that reveal reality.',
    'Robert Cialdini': 'Robert Cialdini is a psychologist whose research on persuasion and social influence shaped how people understand compliance, trust, and decision triggers.',
    'Ryan Holiday': 'Ryan Holiday is a writer and media strategist who popularized modern Stoicism through books about discipline, resilience, ego, and action.',
    'Shane Parrish': 'Shane Parrish is the founder of Farnam Street and a writer focused on mental models, decision-making, and practical wisdom.',
    'Sherlock Holmes': 'Sherlock Holmes is Arthur Conan Doyle\'s fictional detective and a durable symbol of observation, inference, and disciplined attention.',
    'Victor O. Schwab': 'Victor O. Schwab was a direct-response copywriter whose advertising work emphasized reader desire, specific promises, and clear selling.',
    'Warren Buffett': 'Warren Buffett is the chairman of Berkshire Hathaway and one of the most influential investors in history, known for patience, temperament, and business quality.'
};

let peopleSourceFilter = 'all';

function normalizePersonName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generatedImageForPerson(name) {
    const slug = normalizePersonName(name);
    return {
        image: `images/generated/people/${slug}-400.jpg`,
        srcset: [
            `images/generated/people/${slug}-200.jpg 200w`,
            `images/generated/people/${slug}-400.jpg 400w`,
            `images/generated/people/${slug}-800.jpg 800w`
        ].join(', ')
    };
}

function bookLabel(book) {
    const year = book.year || book.published || book.readYear;
    return year ? `${book.title} (${year})` : book.title;
}

function attachBook(person, book) {
    if (!person.books) person.books = [];
    const label = bookLabel(book);
    if (!person.books.some((entry) => entry.title === book.title)) {
        person.books.push({
            author: book.author || '',
            coverImage: book.coverImageMedium || book.coverImage || '',
            href: `books.html?book=${encodeURIComponent(book.title)}`,
            label,
            title: book.title
        });
    }
}

function movieLabel(movie) {
    return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function attachMovie(person, movie) {
    if (!person.movies) person.movies = [];
    if (!person.movies.some((entry) => entry.title === movie.title)) {
        person.movies.push({
            coverImage: movie.poster || '',
            href: `movies.html?movie=${encodeURIComponent(movie.title)}`,
            label: movieLabel(movie),
            title: movie.title,
            year: movie.year || ''
        });
    }
}

function normalizeSubject(subject) {
    return typeof subject === 'string' ? { name: subject } : subject;
}

function profileForName(profiles, name) {
    const id = normalizePersonName(name);
    return profiles.find((profile) => profile.id === id || profile.name === name) || null;
}

function sourceTypeFor(person) {
    return person.sourceType || (person.title?.toLowerCase().includes('fictional') ? 'fiction' : 'nonfiction');
}

function mergeBookPeople(people, books, movies = [], profiles = []) {
    const byName = new Map();
    people.forEach((person) => {
        const profile = profileForName(profiles, person.name);
        byName.set(person.name, {
            ...person,
            bio: profile?.bio || PERSON_BIOS[person.name] || person.lesson || '',
            movies: [],
            profileHref: profile ? `people/${profile.id}.html` : '',
            sourceType: sourceTypeFor(person),
            thesis: profile?.thesis || person.lesson || '',
            books: []
        });
    });

    books.forEach((book) => {
        const subjects = BOOK_PEOPLE[book.title];
        if (!subjects) return;

        subjects.forEach((name) => {
            const existing = byName.get(name);
            const meta = GENERATED_PERSON_META[name] || {};
            const profile = profileForName(profiles, name);
            const imageMeta = generatedImageForPerson(name);
            const person = existing || {
                bio: profile?.bio || meta.bio || PERSON_BIOS[name] || '',
                category: meta.category || 'writers',
                image: imageMeta.image,
                lesson: meta.lesson || 'Learn from the life behind the work',
                name,
                movies: [],
                profileHref: profile ? `people/${profile.id}.html` : '',
                srcset: imageMeta.srcset,
                sourceType: meta.sourceType || 'nonfiction',
                thesis: profile?.thesis || meta.lesson || '',
                title: meta.title || 'Subject'
            };

            byName.set(name, {
                ...person,
                ...meta,
                bio: person.bio || profile?.bio || meta.bio || PERSON_BIOS[name] || '',
                image: person.image || imageMeta.image,
                movies: person.movies || [],
                profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
                srcset: person.srcset || imageMeta.srcset,
                sourceType: person.sourceType || meta.sourceType || 'nonfiction',
                thesis: person.thesis || profile?.thesis || meta.lesson || ''
            });
            attachBook(byName.get(name), book);
        });
    });

    movies.forEach((movie) => {
        const subjects = MOVIE_PEOPLE[movie.title];
        if (!subjects) return;

        subjects.map(normalizeSubject).forEach((subject) => {
            const name = subject.name;
            if (!name) return;
            const existing = byName.get(name);
            const profile = profileForName(profiles, name);
            const meta = GENERATED_PERSON_META[name] || {};
            const imageMeta = generatedImageForPerson(name);
            const sourceType = subject.sourceType || meta.sourceType || 'fiction';
            const person = existing || {
                bio: profile?.bio || subject.bio || meta.bio || PERSON_BIOS[name] || '',
                category: subject.category || meta.category || 'creators',
                image: subject.image || movie.poster || imageMeta.image,
                lesson: subject.lesson || meta.lesson || 'Study the character under pressure',
                name,
                profileHref: profile ? `people/${profile.id}.html` : '',
                sourceType,
                srcset: subject.srcset || '',
                thesis: profile?.thesis || subject.lesson || meta.lesson || '',
                title: subject.title || meta.title || 'Fictional Character'
            };

            byName.set(name, {
                ...person,
                ...subject,
                bio: person.bio || profile?.bio || subject.bio || meta.bio || PERSON_BIOS[name] || '',
                books: person.books || [],
                category: person.category || subject.category || meta.category || 'creators',
                image: person.image || subject.image || movie.poster || imageMeta.image,
                movies: person.movies || [],
                profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
                sourceType: person.sourceType || sourceType,
                srcset: person.srcset || subject.srcset || '',
                thesis: person.thesis || profile?.thesis || subject.lesson || meta.lesson || ''
            });
            attachMovie(byName.get(name), movie);
        });
    });

    return Array.from(byName.values())
        .map((person) => ({
            ...person,
            bio: person.bio || PERSON_BIOS[person.name] || person.lesson || '',
            books: person.books || [],
            movies: person.movies || [],
            sourceType: sourceTypeFor(person),
            searchText: [
                person.name,
                person.title,
                person.lesson,
                sourceTypeFor(person) === 'fiction' ? 'fiction fictional character' : 'non-fiction nonfiction real historical',
                ...(person.books || []).map((book) => book.label),
                ...(person.movies || []).map((movie) => movie.label)
            ].join(' ')
        }))
        .sort((a, b) => ((b.books.length + b.movies.length) - (a.books.length + a.movies.length)) || a.name.localeCompare(b.name));
}

function createPersonCard(person) {
    const article = document.createElement('article');
    article.className = 'person-card';
    article.dataset.category = person.category || '';
    article.dataset.personId = normalizePersonName(person.name);
    article.dataset.search = person.searchText || `${person.name} ${person.title} ${person.lesson}`;
    article.dataset.sourceType = sourceTypeFor(person);
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.innerHTML = `
        <div class="person-image-container">
            <img src="${escapeAttr(person.image)}" alt="${escapeAttr(person.name)}" class="person-image" srcset="${escapeAttr(person.srcset || '')}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" loading="lazy" decoding="async">
        </div>
        <div class="person-info">
            <h3 class="person-name">${escapeHTML(person.name)}</h3>
            <p class="person-source-type">${sourceTypeFor(person) === 'fiction' ? 'Fiction' : 'Non-fiction'}</p>
            <p class="person-title">${escapeHTML(person.title)}</p>
            <p class="person-lesson">${escapeHTML(person.lesson)}</p>
        </div>
    `;
    return article;
}

function buildPeopleRecords(people) {
    return people.map((person) => ({
        category: person.category || '',
        card: createPersonCard(person),
        searchText: String(person.searchText || `${person.name} ${person.title} ${person.lesson}`).toLowerCase(),
        sourceType: sourceTypeFor(person)
    }));
}

function sourceMatches(card) {
    return peopleSourceFilter === 'all' || card.dataset.sourceType === peopleSourceFilter;
}

function updatePeopleSourceButtons() {
    document.querySelectorAll('.people-source-filter-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.actionArgs === peopleSourceFilter);
    });
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
}

function updatePeopleFilterCounts(allCards) {
    const sourceCards = peopleSourceFilter === 'all'
        ? allCards
        : allCards.filter((card) => card.dataset.sourceType === peopleSourceFilter);
    const sourceCounts = allCards.reduce((counts, card) => {
        const source = card.dataset.sourceType || 'nonfiction';
        counts[source] = (counts[source] || 0) + 1;
        return counts;
    }, { fiction: 0, nonfiction: 0 });
    const categoryCounts = sourceCards.reduce((counts, card) => {
        const category = card.dataset.category || '';
        counts[category] = (counts[category] || 0) + 1;
        return counts;
    }, {});

    setText('people-source-count-all', allCards.length);
    setText('people-source-count-nonfiction', sourceCounts.nonfiction || 0);
    setText('people-source-count-fiction', sourceCounts.fiction || 0);
    setText('count-people-all', sourceCards.length);
    ['business', 'writers', 'science', 'creators'].forEach((category) => {
        setText(`count-people-${category}`, categoryCounts[category] || 0);
    });
}

function applyPeopleSourceFilter({ allCards, visibleCards }) {
    const categorySearchVisible = new Set(visibleCards);
    const finalVisible = [];
    allCards.forEach((card) => {
        const visible = categorySearchVisible.has(card) && sourceMatches(card);
        card.style.display = visible ? 'block' : 'none';
        if (visible) finalVisible.push(card);
    });
    setText('people-count', finalVisible.length);
    updatePeopleFilterCounts(allCards);
    updatePeopleSourceButtons();
}

function filterPeopleSource(source, event) {
    peopleSourceFilter = source || 'all';
    const button = event?.target?.closest('.people-source-filter-btn');
    if (button) {
        document.querySelectorAll('.people-source-filter-btn').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
    }
    peopleRuntime?.render();
}

async function loadPeopleCards() {
    const [data, booksData, moviesData, profilesData] = await Promise.all([
        dataFetch.fetchJson('data/people.json'),
        dataFetch.fetchJsonWithFallback(['data/books.generated.json', 'data/books.json']),
        dataFetch.fetchJson('data/movies.json').catch(() => []),
        dataFetch.fetchJson('data/people.profiles.json').catch(() => ({ profiles: [] }))
    ]);
    const people = Array.isArray(data.people) ? data.people : [];
    const books = Array.isArray(booksData) ? booksData : booksData.books || [];
    const movies = Array.isArray(moviesData) ? moviesData : moviesData.movies || [];
    const profiles = Array.isArray(profilesData.profiles) ? profilesData.profiles : [];
    const grid = document.getElementById('people-grid');
    if (grid) {
        const fragment = document.createDocumentFragment();
        const mergedPeople = mergeBookPeople(people, books, movies, profiles);
        peopleById = new Map(mergedPeople.map((person) => [normalizePersonName(person.name), person]));
        peopleCards = buildPeopleRecords(mergedPeople);
        peopleCards.forEach(({ card }) => fragment.appendChild(card));
        grid.innerHTML = '';
        grid.appendChild(fragment);
    }
}

function createMediaMarkup(person, key, label) {
    const entries = person[key] || [];
    if (!entries.length) return '';
    return `
        <div class="person-detail-books">
            <p class="person-detail-section-label">${escapeHTML(label)}</p>
            <div class="person-detail-book-list">
                ${entries.map((item) => `
                    <a class="person-detail-book-link" href="${escapeAttr(item.href)}">
                        ${item.coverImage ? `<img class="person-detail-book-cover" src="${escapeAttr(item.coverImage)}" alt="${escapeAttr(item.title)} cover" loading="lazy" decoding="async">` : '<span class="person-detail-book-cover person-detail-book-cover-fallback" aria-hidden="true"></span>'}
                        <span class="person-detail-book-meta">
                            <span class="person-detail-book-title">${escapeHTML(item.label)}</span>
                            ${item.author ? `<span class="person-detail-book-author">${escapeHTML(item.author)}</span>` : ''}
                        </span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

function createBooksMarkup(person) {
    return `${createMediaMarkup(person, 'books', 'Books')}${createMediaMarkup(person, 'movies', 'Movies')}`;
}

function ensurePeopleDetailModal() {
    let modal = document.getElementById('person-detail-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'person-detail-modal';
    modal.className = 'person-detail-modal';
    modal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(modal);
    return modal;
}

function closePeopleDetail() {
    const modal = document.getElementById('person-detail-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('person-detail-open');
    lastFocusedPerson?.focus();
    lastFocusedPerson = null;
}

function openPeopleDetail(person, trigger) {
    const modal = ensurePeopleDetailModal();
    lastFocusedPerson = trigger || document.activeElement;
    modal.innerHTML = `
        <div class="person-detail-backdrop" data-action="close-person-detail"></div>
        <article class="person-detail-panel" role="dialog" aria-modal="true" aria-labelledby="person-detail-title">
            <button class="person-detail-close" type="button" data-action="close-person-detail" aria-label="Close person detail">X</button>
            <div class="person-detail-hero">
                <div class="person-detail-image-wrap">
                    <img src="${escapeAttr(person.image)}" alt="${escapeAttr(person.name)}" class="person-detail-image" srcset="${escapeAttr(person.srcset || '')}" sizes="(max-width: 768px) 78vw, 320px" width="400" height="400">
                </div>
                <div class="person-detail-copy">
                    <p class="person-detail-kicker">${escapeHTML(person.title)}</p>
                    <h2 id="person-detail-title">${escapeHTML(person.name)}</h2>
                    <p class="person-detail-bio">${escapeHTML(person.bio || person.lesson)}</p>
                    <p class="person-detail-blurb">${escapeHTML(person.lesson)}</p>
                    ${person.profileHref ? `<a class="person-detail-profile-link" href="${escapeAttr(person.profileHref)}">View profile</a>` : ''}
                </div>
            </div>
            ${createBooksMarkup(person)}
        </article>
    `;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('person-detail-open');
    modal.querySelector('.person-detail-close')?.focus();
}

function initPeopleDetail() {
    const grid = document.querySelector('.people-grid');
    if (!grid) return;

    grid.addEventListener('click', (event) => {
        const card = event.target.closest('.person-card');
        if (!card) return;
        const person = peopleById.get(card.dataset.personId || '');
        if (!person) return;
        openPeopleDetail(person, card);
    });

    grid.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('.person-card');
        if (!card) return;
        event.preventDefault();
        const person = peopleById.get(card.dataset.personId || '');
        if (person) openPeopleDetail(person, card);
    });

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="close-person-detail"]')) closePeopleDetail();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closePeopleDetail();
    });
}

async function initPeoplePage() {
    peopleRuntime = window.JGCollectionRuntime.create({
        actions: {
            clearSearch: 'clearPeopleSearch',
            filter: 'filterByCategory',
            search: 'filterPeople',
            toggleSidebar: 'togglePeopleSidebar'
        },
        allButtonSelector: '[data-action="filterByCategory"][data-action-args="all"]',
        buttonSelector: '.sidebar-category',
        cardSelector: '.person-card',
        categoryMode: 'exact',
        counterId: 'people-count',
        layoutId: 'people-layout',
        searchClearButtonId: 'people-search-clear-btn',
        searchClearDisplay: 'block',
        searchInputId: 'people-search',
        sidebarId: 'people-sidebar',
        storageKey: 'people-sidebar-collapsed',
        onRender: applyPeopleSourceFilter,
        useDisplayStyle: true
    });
    await loadPeopleCards();
    window.JGActions?.register({ filterPeopleSource });
    peopleRuntime.init();
    initPeopleDetail();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPeoplePage().catch((error) => console.error('Error loading people:', error));
    });
} else {
    initPeoplePage().catch((error) => console.error('Error loading people:', error));
}



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


