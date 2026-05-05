(function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyObj = any;
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
    layout: document.querySelector('.cool-page') as HTMLElement | null,
    tabs: document.querySelectorAll<HTMLElement>('.cool-tab'),
  };

  if (!els.feed) return;

  const escapeHtml = window.escapeHTML as (s: unknown) => string;

  function safeUrl(url: unknown, fallback = '#'): string {
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

  function monthKey(iso: string) { return iso.slice(0, 7); }
  function monthLabel(key: string) {
    const [y, m] = key.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }
  function dayLabel(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }

  function renderFeed(items: AnyObj[], cats: AnyObj[]) {
    const catLookup: Record<string, AnyObj> = Object.fromEntries(cats.map((c) => [c.id, c]));
    els.feed!.innerHTML = items.map((item) => {
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
    if (els.feedCount) els.feedCount.textContent = `${items.length} items`;
  }

  const userToggledMonths = new Set<string>();

  function renderTimeline(items: AnyObj[]) {
    const groups = new Map<string, AnyObj[]>();
    for (const it of items) {
      const k = monthKey(it.date);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(it);
    }
    const keys = [...groups.keys()].sort().reverse();
    els.timeline!.innerHTML = keys.map((k, i) => {
      const entries = groups.get(k)!.map((it: AnyObj) => `
        <li class="timeline-entry" data-target="item-${escapeHtml(it.id)}">
          <span class="timeline-entry-date">${escapeHtml(dayLabel(it.date))}</span>
          ${escapeHtml(it.title)}
        </li>`).join('');
      return `
        <div class="timeline-month${i === 0 ? '' : ' collapsed'}" data-month="${escapeHtml(k)}">
          <button type="button" class="timeline-month-label" aria-expanded="${i === 0 ? 'true' : 'false'}">
            <span>${escapeHtml(monthLabel(k))}</span>
            <span style="display:inline-flex;align-items:center;gap:6px">
              <span class="timeline-month-count">${groups.get(k)!.length}</span>
              <span class="timeline-month-chev">▾</span>
            </span>
          </button>
          <ul class="timeline-entries">${entries}</ul>
        </div>`;
    }).join('');

    els.timeline!.addEventListener('click', (e: Event) => {
      const target0 = e.target as Element | null;
      const monthBtn = target0?.closest?.('.timeline-month-label') as HTMLElement | null;
      if (monthBtn) {
        const month = monthBtn.closest('.timeline-month') as HTMLElement;
        const collapsed = month.classList.toggle('collapsed');
        monthBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        userToggledMonths.add(month.dataset.month || '');
        return;
      }
      const entry = target0?.closest?.('.timeline-entry') as HTMLElement | null;
      if (!entry) return;
      const id = entry.dataset.target || '';
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveTimelineEntry(id);
      }
    });

    const toggleAll = document.getElementById('timeline-toggle-all');
    if (toggleAll) {
      toggleAll.addEventListener('click', () => {
        const months = els.timeline!.querySelectorAll<HTMLElement>('.timeline-month');
        const anyExpanded = [...months].some((m) => !m.classList.contains('collapsed'));
        months.forEach((m) => {
          m.classList.toggle('collapsed', anyExpanded);
          const btn = m.querySelector('.timeline-month-label');
          if (btn) btn.setAttribute('aria-expanded', anyExpanded ? 'false' : 'true');
          userToggledMonths.add(m.dataset.month || '');
        });
        toggleAll.textContent = anyExpanded ? 'Expand all' : 'Collapse all';
      });
    }
  }

  function setActiveTimelineEntry(itemId: string) {
    let activeMonthKey: string | null = null;
    els.timeline!.querySelectorAll<HTMLElement>('.timeline-entry').forEach((el) => {
      const active = el.dataset.target === itemId;
      el.classList.toggle('active', active);
      if (active) {
        const month = el.closest('.timeline-month') as HTMLElement | null;
        if (month) {
          activeMonthKey = month.dataset.month || null;
          if (month.classList.contains('collapsed')) {
            month.classList.remove('collapsed');
            const btn = month.querySelector('.timeline-month-label');
            if (btn) btn.setAttribute('aria-expanded', 'true');
          }
        }
      }
    });
    if (!activeMonthKey) return;
    els.timeline!.querySelectorAll<HTMLElement>('.timeline-month').forEach((month) => {
      const key = month.dataset.month || '';
      if (key <= (activeMonthKey as string)) return;
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

  function renderTagRail(items: AnyObj[], cats: AnyObj[]) {
    if (!els.tagRail) return;
    const byCat = new Map<string, number>();
    for (const it of items) {
      byCat.set(it.category, (byCat.get(it.category) || 0) + 1);
    }
    const ordered = cats.filter((c: AnyObj) => byCat.has(c.id));
    const allPill = `<button type="button" class="cool-tag-pill active" data-cat="all">All <span class="count">${items.length}</span></button>`;
    const catPills = ordered.map((c: AnyObj) => `
      <button type="button" class="cool-tag-pill" data-cat="${escapeHtml(c.id)}">
        <span aria-hidden="true">${escapeHtml(c.emoji || '')}</span>${escapeHtml(c.label)}
        <span class="count">${byCat.get(c.id)}</span>
      </button>`).join('');
    els.tagRail.innerHTML = allPill + catPills;

    els.tagRail.addEventListener('click', (e) => {
      const pill = (e.target as Element | null)?.closest?.('.cool-tag-pill') as HTMLElement | null;
      if (!pill) return;
      const cat = pill.dataset.cat || 'all';
      setFilter(cat);
    });
  }

  function setFilter(cat: string) {
    if (els.tagRail) {
      els.tagRail.querySelectorAll<HTMLElement>('.cool-tag-pill').forEach((p) => {
        p.classList.toggle('active', p.dataset.cat === cat);
      });
    }
    let visible = 0;
    document.querySelectorAll<HTMLElement>('.feed-item').forEach((el) => {
      const match = cat === 'all' || el.dataset.category === cat;
      el.hidden = !match;
      if (match) visible += 1;
    });
    if (els.feedCount) els.feedCount.textContent = `${visible} item${visible === 1 ? '' : 's'}`;
    if (els.feedEmpty) els.feedEmpty.hidden = visible !== 0;
  }

  function relativeUpdated(iso: string) {
    if (!iso) return '—';
    const now = new Date();
    const then = new Date(iso + 'T12:00:00');
    const days = Math.max(0, Math.round((now.getTime() - then.getTime()) / 86400000));
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.round(days / 365);
    return `${years}y ago`;
  }

  function renderHeroStats(items: AnyObj[], cats: AnyObj[]) {
    if (els.heroCount) els.heroCount.textContent = String(items.length);
    const usedCats = new Set(items.map((it: AnyObj) => it.category));
    if (els.heroCats) els.heroCats.textContent = String(usedCats.size || cats.length);
    const latest = items[0] && items[0].date;
    if (els.heroUpdated) els.heroUpdated.textContent = relativeUpdated(latest);
  }

  function setTab(name: string) {
    els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    if (els.layout) els.layout.dataset.active = name;
  }

  function wireTabs() {
    els.tabs.forEach((t) => {
      t.addEventListener('click', () => setTab(t.dataset.tab || ''));
    });
  }

  async function init() {
    let data: AnyObj;
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

export {};
