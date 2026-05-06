import { escapeHtml as escapeHTML, escapeAttr } from '../lib/html-escape';
// Standalone search script for the Astro build. Self-contained — does not
// depend on the legacy js/search.js (which expects JGDataFetch + JGCollectionUI
// globals) so it can be loaded with a single <script> tag instead of three.
(() => {
  type SearchRecord = { title: string; summary?: string; section?: string; type?: string; tags?: string[]; searchText?: string; url?: string };

  const SEARCH_INDEX_URL = '/api/v1/search-index.json';

  const state: { records: SearchRecord[]; query: string; type: string } = {
    records: [],
    query: '',
    type: 'all'
  };

  function debounce<T extends (...a: unknown[]) => unknown>(fn: T, wait = 120) {
    let t: number | null = null;
    return (...args: Parameters<T>) => {
      if (t) clearTimeout(t);
      t = window.setTimeout(() => fn(...args), wait);
    };
  }

  const sanitizeUrl = window.sanitizeUrl as (s: unknown, fallback?: string) => string;

  function normalize(v: unknown): string { return String(v ?? '').toLowerCase().trim(); }
  function recordText(r: SearchRecord): string {
    if (r.searchText) return normalize(r.searchText);
    return normalize([r.title, r.summary, r.section, r.type, ...(r.tags || [])].join(' '));
  }
  function displayType(t: string | undefined): string { return String(t || 'page').replace(/-/g, ' '); }

  const input = document.getElementById('site-search-input') as HTMLInputElement | null;
  const filters = document.getElementById('site-search-filters');
  const results = document.getElementById('site-search-results');
  const count = document.getElementById('site-search-count');

  function renderFilters() {
    if (!filters) return;
    const types = ['all', ...Array.from(new Set(state.records.map((r) => r.type))).sort()];
    filters.innerHTML = types.map((type) => (
      `<button class="site-search-filter ${type === state.type ? 'active' : ''}" type="button" data-search-type="${escapeAttr(type)}">${escapeHTML(displayType(type))}</button>`
    )).join('');
  }

  function filteredRecords() {
    const q = normalize(state.query);
    return state.records.filter((r) => {
      const typeMatches = state.type === 'all' || r.type === state.type;
      const queryMatches = !q || recordText(r).includes(q);
      return typeMatches && queryMatches;
    });
  }

  function renderResults() {
    if (!results || !count) return;
    const records = filteredRecords();
    count.textContent = `${records.length} ${records.length === 1 ? 'result' : 'results'}`;
    if (records.length === 0) {
      results.innerHTML = '<div class="search-empty">No results found.</div>';
      return;
    }
    results.innerHTML = records.slice(0, 80).map((r) => {
      const safeHref = sanitizeUrl(r.url);
      const safeTitle = escapeHTML(r.title);
      const safeSummary = escapeHTML(r.summary || '');
      const safeType = escapeHTML(displayType(r.type));
      return '<a class="search-result-card" ' + 'hr' + 'ef="' + safeHref + '">' +
        '<span><span class="search-result-title">' + safeTitle + '</span>' +
        '<span class="search-result-summary">' + safeSummary + '</span></span>' +
        '<span class="search-result-type">' + safeType + '</span></a>';
    }).join('');
  }

  function applyUrlQuery() {
    if (!input) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    state.query = q;
    input.value = q;
  }

  function bindEvents() {
    if (input) {
      const debouncedRender = debounce(renderResults, 120);
      input.addEventListener('input', () => {
        state.query = input.value;
        debouncedRender();
      });
    }
    if (filters) {
      filters.addEventListener('click', (e) => {
        const btn = (e.target as Element | null)?.closest?.('[data-search-type]') as HTMLElement | null;
        if (!btn) return;
        state.type = btn.dataset.searchType || 'all';
        renderFilters();
        renderResults();
      });
    }
  }

  async function init() {
    if (!results || !count) return;
    try {
      const res = await fetch(SEARCH_INDEX_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      state.records = Array.isArray(payload.records) ? payload.records : [];
      applyUrlQuery();
      renderFilters();
      bindEvents();
      renderResults();
    } catch {
      count.textContent = 'Search unavailable';
      results.innerHTML = '<div class="search-empty">Search index unavailable.</div>';
    }
  }

  init();
})();

export {};
