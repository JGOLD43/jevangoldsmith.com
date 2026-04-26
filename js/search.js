(function() {
    'use strict';

    const state = {
        records: [],
        query: '',
        type: 'all'
    };

    const input = document.getElementById('site-search-input');
    const filters = document.getElementById('site-search-filters');
    const results = document.getElementById('site-search-results');
    const count = document.getElementById('site-search-count');

    function normalize(value) {
        return String(value || '').toLowerCase().trim();
    }

    function recordText(record) {
        return normalize([
            record.title,
            record.summary,
            record.section,
            record.type,
            ...(record.tags || [])
        ].join(' '));
    }

    function displayType(type) {
        return String(type || 'page').replace(/-/g, ' ');
    }

    function renderFilters() {
        if (!filters) return;
        const types = ['all', ...Array.from(new Set(state.records.map((record) => record.type))).sort()];
        filters.innerHTML = types.map((type) => (
            `<button class="site-search-filter ${type === state.type ? 'active' : ''}" type="button" data-search-type="${escapeAttr(type)}">${escapeHTML(displayType(type))}</button>`
        )).join('');
    }

    function filteredRecords() {
        const query = normalize(state.query);
        return state.records.filter((record) => {
            const typeMatches = state.type === 'all' || record.type === state.type;
            const queryMatches = !query || recordText(record).includes(query);
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

        results.innerHTML = records.slice(0, 80).map((record) => `
            <a class="search-result-card" href="${sanitizeUrl(record.url)}">
                <span>
                    <span class="search-result-title">${escapeHTML(record.title)}</span>
                    <span class="search-result-summary">${escapeHTML(record.summary || '')}</span>
                </span>
                <span class="search-result-type">${escapeHTML(displayType(record.type))}</span>
            </a>
        `).join('');
    }

    function applyUrlQuery() {
        if (!input) return;
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q') || '';
        state.query = query;
        input.value = query;
    }

    function bindEvents() {
        if (input) {
            input.addEventListener('input', () => {
                state.query = input.value;
                renderResults();
            });
        }

        if (filters) {
            filters.addEventListener('click', (event) => {
                const button = event.target.closest('[data-search-type]');
                if (!button) return;
                state.type = button.dataset.searchType || 'all';
                renderFilters();
                renderResults();
            });
        }
    }

    async function initSearch() {
        if (!results || !count) return;
        try {
            const response = await fetch('api/v1/search-index.json');
            if (!response.ok) throw new Error(`Search index returned ${response.status}`);
            const payload = await response.json();
            state.records = Array.isArray(payload.records) ? payload.records : [];
            applyUrlQuery();
            renderFilters();
            bindEvents();
            renderResults();
        } catch (error) {
            count.textContent = 'Search unavailable';
            results.innerHTML = '<div class="search-empty">Search index unavailable.</div>';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }
})();
