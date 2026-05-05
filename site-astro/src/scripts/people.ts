// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
const { escapeHTML, escapeAttr, sanitizeUrl, sanitizeHTML } = (typeof window !== "undefined" ? window : globalThis);

const dataFetch = window.JGDataFetch;

let peopleCards = [];
let peopleRuntime = null;
let peopleById = new Map();
let lastFocusedPerson = null;

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

function sourceTypeFor(person) {
    return person.sourceType || (person.title?.toLowerCase().includes('fictional') ? 'fiction' : 'nonfiction');
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
    const grid = document.getElementById('people-grid');
    if (!grid) return;

    // All 98 cards are SSR'd from data/people.merged.generated.json.
    // The merged data is inlined as JSON in #people-merged-data for the
    // detail modal. No runtime fetch / merge required.
    let mergedPeople = [];
    const dataNode = document.getElementById('people-merged-data');
    if (dataNode?.textContent) {
        try {
            const parsed = JSON.parse(dataNode.textContent);
            mergedPeople = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('people: failed to parse inlined merged data', error);
        }
    }

    // Backstop: if inline data is missing (older deploys, hot-reload edge),
    // fetch the merged file once. Still 1 request, not 4.
    if (!mergedPeople.length) {
        try {
            const fallback = await dataFetch.fetchJson('data/people.merged.generated.json');
            mergedPeople = Array.isArray(fallback?.people) ? fallback.people : [];
        } catch (error) {
            console.error('people: merged data unavailable', error);
        }
    }

    peopleById = new Map(mergedPeople.map((person) => [normalizePersonName(person.name), person]));

    // SSR'd cards already cover every merged person. Walk the existing
    // .person-card nodes and bind records from the inline data — no DOM
    // mutation, no CLS, no fetch.
    const existingByPersonId = new Map();
    for (const card of grid.querySelectorAll('.person-card')) {
        const id = card.getAttribute('data-person-id');
        if (id) existingByPersonId.set(id, card);
    }

    const fragment = document.createDocumentFragment();
    const records = [];
    let appendCount = 0;
    for (const person of mergedPeople) {
        const personId = normalizePersonName(person.name);
        let card = existingByPersonId.get(personId);
        if (!card) {
            card = createPersonCard(person);
            fragment.appendChild(card);
            appendCount += 1;
        }
        records.push({
            category: person.category || '',
            card,
            searchText: String(person.searchText || `${person.name} ${person.title} ${person.lesson}`).toLowerCase(),
            sourceType: sourceTypeFor(person)
        });
    }
    peopleCards = records;
    if (appendCount > 0) grid.appendChild(fragment);
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

export {};
