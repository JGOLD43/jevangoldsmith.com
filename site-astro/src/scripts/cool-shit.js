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
