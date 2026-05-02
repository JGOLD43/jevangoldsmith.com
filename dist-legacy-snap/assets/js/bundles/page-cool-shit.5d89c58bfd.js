
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



/* js/cool-shit.js */
(function () {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const els = {
    feed: document.getElementById('feed'),
    feedCount: document.getElementById('feed-count'),
    feedEmpty: document.getElementById('feed-empty'),
    timeline: document.getElementById('timeline'),
    tagRail: document.getElementById('tag-rail'),
    heroCount: document.getElementById('hero-count'),
    heroCats: document.getElementById('hero-cats'),
    heroUpdated: document.getElementById('hero-updated'),
    layout: document.querySelector('.cool-page'),
    tabs: document.querySelectorAll('.cool-tab'),
  };

  let activeFilter = 'all';
  let allItems = [];

  if (!els.feed) return;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function safeUrl(url, fallback = '#') {
    const raw = String(url || '').trim();
    if (!raw) return fallback;
    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
      return escapeHtml(raw);
    }
    try {
      const parsed = new URL(raw, window.location.origin);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
        return escapeHtml(raw);
      }
    } catch {
      return fallback;
    }
    return fallback;
  }

  function monthKey(iso) { return iso.slice(0, 7); }
  function monthLabel(key) {
    const [y, m] = key.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }
  function dayLabel(iso) {
    const d = new Date(iso + 'T12:00:00');
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }

  function renderFeed(items, cats) {
    const catLookup = Object.fromEntries(cats.map((c) => [c.id, c]));
    els.feed.innerHTML = items.map((item) => {
      const cat = catLookup[item.category] || { label: item.category, emoji: '' };
      const imgHtml = item.image
        ? `<img class="feed-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">`
        : '';
      const linkHtml = item.url
        ? `<a class="feed-item-link" href="${safeUrl(item.url)}" target="_blank" rel="noopener">Visit ${escapeHtml(item.source)} →</a>`
        : '';
      return `
        <article class="feed-item type-${escapeHtml(item.type)}" id="item-${escapeHtml(item.id)}" data-id="${escapeHtml(item.id)}" data-month="${escapeHtml(monthKey(item.date))}" data-category="${escapeHtml(item.category)}">
          ${imgHtml}
          <div class="feed-item-body">
            <div class="feed-item-meta">
              <span class="feed-item-tag">${escapeHtml(cat.label)}</span>
              <span class="feed-item-date">${escapeHtml(dayLabel(item.date))}</span>
              <span class="feed-item-source">${escapeHtml(item.source || '')}</span>
            </div>
            <h3 class="feed-item-title">${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.body)}</p>
            ${linkHtml}
          </div>
        </article>`;
    }).join('');
    els.feedCount.textContent = `${items.length} items`;
  }

  const userToggledMonths = new Set();

  function renderTimeline(items) {
    const groups = new Map();
    for (const it of items) {
      const k = monthKey(it.date);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    const keys = [...groups.keys()].sort().reverse();
    els.timeline.innerHTML = keys.map((k, i) => {
      const entries = groups.get(k).map((it) => `
        <li class="timeline-entry" data-target="item-${escapeHtml(it.id)}">
          <span class="timeline-entry-date">${escapeHtml(dayLabel(it.date))}</span>
          ${escapeHtml(it.title)}
        </li>`).join('');
      return `
        <div class="timeline-month${i === 0 ? '' : ' collapsed'}" data-month="${escapeHtml(k)}">
          <button type="button" class="timeline-month-label" aria-expanded="${i === 0 ? 'true' : 'false'}">
            <span>${escapeHtml(monthLabel(k))}</span>
            <span style="display:inline-flex;align-items:center;gap:6px">
              <span class="timeline-month-count">${groups.get(k).length}</span>
              <span class="timeline-month-chev">▾</span>
            </span>
          </button>
          <ul class="timeline-entries">${entries}</ul>
        </div>`;
    }).join('');

    els.timeline.addEventListener('click', (e) => {
      const monthBtn = e.target.closest('.timeline-month-label');
      if (monthBtn) {
        const month = monthBtn.closest('.timeline-month');
        const collapsed = month.classList.toggle('collapsed');
        monthBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        userToggledMonths.add(month.dataset.month);
        return;
      }
      const entry = e.target.closest('.timeline-entry');
      if (!entry) return;
      const id = entry.dataset.target;
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveTimelineEntry(id);
      }
    });

    const toggleAll = document.getElementById('timeline-toggle-all');
    if (toggleAll) {
      toggleAll.addEventListener('click', () => {
        const months = els.timeline.querySelectorAll('.timeline-month');
        const anyExpanded = [...months].some((m) => !m.classList.contains('collapsed'));
        months.forEach((m) => {
          m.classList.toggle('collapsed', anyExpanded);
          const btn = m.querySelector('.timeline-month-label');
          if (btn) btn.setAttribute('aria-expanded', anyExpanded ? 'false' : 'true');
          userToggledMonths.add(m.dataset.month);
        });
        toggleAll.textContent = anyExpanded ? 'Expand all' : 'Collapse all';
      });
    }
  }

  function setActiveTimelineEntry(itemId) {
    let activeMonthKey = null;
    els.timeline.querySelectorAll('.timeline-entry').forEach((el) => {
      const active = el.dataset.target === itemId;
      el.classList.toggle('active', active);
      if (active) {
        const month = el.closest('.timeline-month');
        if (month) {
          activeMonthKey = month.dataset.month;
          if (month.classList.contains('collapsed')) {
            month.classList.remove('collapsed');
            const btn = month.querySelector('.timeline-month-label');
            if (btn) btn.setAttribute('aria-expanded', 'true');
          }
        }
      }
    });
    if (!activeMonthKey) return;
    els.timeline.querySelectorAll('.timeline-month').forEach((month) => {
      const key = month.dataset.month;
      if (key <= activeMonthKey) return;
      if (userToggledMonths.has(key)) return;
      if (month.classList.contains('collapsed')) return;
      month.classList.add('collapsed');
      const btn = month.querySelector('.timeline-month-label');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function wireScrollSpy() {
    const cards = [...document.querySelectorAll('.feed-item')];
    if (!cards.length || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveTimelineEntry(visible[0].target.id);
    }, { rootMargin: '-96px 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] });
    cards.forEach((c) => obs.observe(c));
  }

  function renderTagRail(items, cats) {
    if (!els.tagRail) return;
    const byCat = new Map();
    for (const it of items) {
      byCat.set(it.category, (byCat.get(it.category) || 0) + 1);
    }
    const ordered = cats.filter((c) => byCat.has(c.id));
    const allPill = `<button type="button" class="cool-tag-pill active" data-cat="all">All <span class="count">${items.length}</span></button>`;
    const catPills = ordered.map((c) => `
      <button type="button" class="cool-tag-pill" data-cat="${escapeHtml(c.id)}">
        <span aria-hidden="true">${escapeHtml(c.emoji || '')}</span>${escapeHtml(c.label)}
        <span class="count">${byCat.get(c.id)}</span>
      </button>`).join('');
    els.tagRail.innerHTML = allPill + catPills;

    els.tagRail.addEventListener('click', (e) => {
      const pill = e.target.closest('.cool-tag-pill');
      if (!pill) return;
      const cat = pill.dataset.cat;
      setFilter(cat);
    });
  }

  function setFilter(cat) {
    activeFilter = cat;
    if (els.tagRail) {
      els.tagRail.querySelectorAll('.cool-tag-pill').forEach((p) => {
        p.classList.toggle('active', p.dataset.cat === cat);
      });
    }
    let visible = 0;
    document.querySelectorAll('.feed-item').forEach((el) => {
      const match = cat === 'all' || el.dataset.category === cat;
      el.hidden = !match;
      if (match) visible += 1;
    });
    if (els.feedCount) els.feedCount.textContent = `${visible} item${visible === 1 ? '' : 's'}`;
    if (els.feedEmpty) els.feedEmpty.hidden = visible !== 0;
  }

  function relativeUpdated(iso) {
    if (!iso) return '—';
    const now = new Date();
    const then = new Date(iso + 'T12:00:00');
    const days = Math.max(0, Math.round((now - then) / 86400000));
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.round(days / 365);
    return `${years}y ago`;
  }

  function renderHeroStats(items, cats) {
    if (els.heroCount) els.heroCount.textContent = items.length;
    const usedCats = new Set(items.map((it) => it.category));
    if (els.heroCats) els.heroCats.textContent = usedCats.size || cats.length;
    const latest = items[0] && items[0].date;
    if (els.heroUpdated) els.heroUpdated.textContent = relativeUpdated(latest);
  }

  function setTab(name) {
    els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    els.layout.dataset.active = name;
  }

  function wireTabs() {
    els.tabs.forEach((t) => {
      t.addEventListener('click', () => setTab(t.dataset.tab));
    });
  }

  async function init() {
    let data;
    try {
      const res = await fetch('data/cool-shit.json', { cache: 'no-cache' });
      data = await res.json();
    } catch (err) {
      els.feed.innerHTML = '<p style="color:var(--text-light)">Could not load feed.</p>';
      return;
    }
    const items = [...data.items].sort((a, b) => b.date.localeCompare(a.date));
    allItems = items;
    renderFeed(items, data.categories);
    renderTimeline(items);
    renderTagRail(items, data.categories);
    renderHeroStats(items, data.categories);
    wireScrollSpy();
    wireTabs();
    if (items[0]) setActiveTimelineEntry(`item-${items[0].id}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


