import { debounce } from '../lib/debounce';
import { sanitizeUrl } from '../lib/safe-url';
import { cloneTemplateElement } from './dom-template';
import { TIMING } from './timing';

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
    const fragment = document.createDocumentFragment();
    for (const type of types) {
      const button = cloneTemplateElement<HTMLButtonElement>('site-search-filter-template');
      if (!button) continue;
      button.dataset.searchType = type;
      button.textContent = displayType(type);
      button.classList.toggle('active', type === state.type);
      fragment.appendChild(button);
    }
    filters.replaceChildren(fragment);
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
      renderEmpty('No results found.');
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const record of records.slice(0, 80)) {
      const card = cloneTemplateElement<HTMLAnchorElement>('site-search-result-template');
      if (!card) continue;
      card.href = sanitizeUrl(record.url);
      const title = card.querySelector('.search-result-title');
      const summary = card.querySelector('.search-result-summary');
      const type = card.querySelector('.search-result-type');
      if (title) title.textContent = record.title;
      if (summary) summary.textContent = record.summary || '';
      if (type) type.textContent = displayType(record.type);
      fragment.appendChild(card);
    }
    results.replaceChildren(fragment);
  }

  function renderEmpty(message: string) {
    if (!results) return;
    const empty = cloneTemplateElement<HTMLElement>('site-search-empty-template');
    if (!empty) return;
    empty.textContent = message;
    results.replaceChildren(empty);
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
      const debouncedRender = debounce(renderResults, TIMING.searchDebounce);
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
      renderEmpty('Search index unavailable.');
    }
  }

  init();
})();

export {};
