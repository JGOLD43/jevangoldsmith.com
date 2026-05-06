import { escapeHtml as escapeHtml } from '../lib/html-escape';
import { monthKey, dayLabel } from '../lib/dates';
import { sanitizeUrl as safeUrl } from '../lib/safe-url';
import { readInlineJson } from './data-fetch';

(function () {
  const els = {
    feed: document.getElementById('feed'),
    feedCount: document.getElementById('feed-count'),
    feedEmpty: document.getElementById('feed-empty'),
    tagRail: document.getElementById('tag-rail'),
    heroCount: document.getElementById('hero-count'),
    heroCats: document.getElementById('hero-cats'),
    heroUpdated: document.getElementById('hero-updated'),
  };

  if (!els.feed) return;


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

  function init() {
    const data = readInlineJson<AnyObj>('jg-cool-shit-data');
    if (!data) {
      els.feed!.innerHTML = '<p style="color:var(--text-light)">Could not load feed.</p>';
      return;
    }
    const items = [...data.items].sort((a, b) => b.date.localeCompare(a.date));
    renderFeed(items, data.categories);
    renderTagRail(items, data.categories);
    renderHeroStats(items, data.categories);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

export {};
