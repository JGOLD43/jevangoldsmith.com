// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
const { escapeHTML, escapeAttr, sanitizeUrl, sanitizeHTML } = (typeof window !== "undefined" ? window : globalThis);

// Standalone search script for the Astro build. Self-contained — does not
// depend on the legacy js/search.js (which expects JGDataFetch + JGCollectionUI
// globals) so it can be loaded with a single <script> tag instead of three.
(() => {
  const SEARCH_INDEX_URL = '/api/v1/search-index.json';

  const state = {
    records: [],
    query: '',
    type: 'all'
  };

  function debounce(fn, wait = 120) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) { return escapeHTML(s); }
  function sanitizeUrl(u) {
    if (!u) return '#';
    if (/^javascript:/i.test(u)) return '#';
    return u;
  }

  function normalize(v) { return String(v ?? '').toLowerCase().trim(); }
  function recordText(r) {
    if (r.searchText) return normalize(r.searchText);
    return normalize([r.title, r.summary, r.section, r.type, ...(r.tags || [])].join(' '));
  }
  function displayType(t) { return String(t || 'page').replace(/-/g, ' '); }

  const input = document.getElementById('site-search-input');
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
        const btn = e.target?.closest('[data-search-type]');
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
