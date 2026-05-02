
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



/* js/shelf.js */
(function () {
  'use strict';

  function track(name, details) {
    if (window.JGAnalytics && typeof window.JGAnalytics.track === 'function') {
      window.JGAnalytics.track(name, details);
    }
  }

  function initFilters(zoom) {
    const filter = document.querySelector('[data-shelf-filter]');
    const cards = Array.from(document.querySelectorAll('[data-shelf-card]'));
    if (!filter || cards.length === 0) return;

    function setCards(category) {
      let visibleIndex = 0;
      cards.forEach(function (card) {
        const visible = category === 'all' || card.dataset.category === category;
        const item = card.querySelector('[data-shelf-item]');
        window.clearTimeout(card.shelfFilterTimer);
        if (visible) card.hidden = false;
        card.style.setProperty('--shelf-filter-index', visibleIndex);
        card.classList.toggle('is-filtered-out', !visible);
        card.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (item) item.tabIndex = visible ? 0 : -1;
        if (!visible) {
          card.shelfFilterTimer = window.setTimeout(function () {
            card.hidden = true;
          }, 360);
        }
        if (visible) visibleIndex += 1;
      });
    }

    filter.addEventListener('click', function (event) {
      const button = event.target.closest('[data-shelf-category]');
      if (!button) return;
      const category = button.dataset.shelfCategory;
      filter.querySelectorAll('[data-shelf-category]').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      setCards(category);
      if (zoom) zoom.release();
      track('shelf_filter', { category });
    });
  }

  function initShelf() {
    const grid = document.querySelector('.shelf-grid');
    if (!grid) return;
    grid.classList.add('js-zoom-grid');
    document.querySelectorAll('.shelf-item').forEach(function (el) {
      el.classList.add('js-zoom-item');
    });

    const zoom = window.JGGridZoom && window.JGGridZoom.init({
      grid: grid,
      itemSelector: '.shelf-item',
      triggerSelector: '[data-shelf-item]',
      eventName: 'shelf_object_open'
    });

    initFilters(zoom);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShelf);
  } else {
    initShelf();
  }
}());



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


