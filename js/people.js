const dataFetch = window.JGDataFetch;

let peopleCards = [];
let peopleRuntime = null;

function createPersonCard(person) {
    const article = document.createElement('article');
    article.className = 'person-card js-zoom-item';
    article.dataset.category = person.category || '';
    article.dataset.search = person.searchText || `${person.name} ${person.title} ${person.lesson}`;
    article.innerHTML = `
        <div class="person-image-container">
            <img src="${escapeAttr(person.image)}" alt="${escapeAttr(person.name)}" class="person-image" srcset="${escapeAttr(person.srcset || '')}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" loading="lazy" decoding="async">
        </div>
        <div class="person-info">
            <h3 class="person-name">${escapeHTML(person.name)}</h3>
            <p class="person-title">${escapeHTML(person.title)}</p>
            <p class="person-lesson">${escapeHTML(person.lesson)}</p>
        </div>
    `;
    return article;
}

function buildPeopleRecords(people) {
    return people.map((person) => ({
        category: person.category || '',
        card: createPersonCard(person),
        searchText: String(person.searchText || `${person.name} ${person.title} ${person.lesson}`).toLowerCase()
    }));
}

async function loadPeopleCards() {
    const data = await dataFetch.fetchJson('data/people.json');
    const people = Array.isArray(data.people) ? data.people : [];
    const grid = document.getElementById('people-grid');
    if (grid) {
        const fragment = document.createDocumentFragment();
        peopleCards = buildPeopleRecords(people);
        peopleCards.forEach(({ card }) => fragment.appendChild(card));
        grid.innerHTML = '';
        grid.appendChild(fragment);
    }
}

function initPeopleZoom() {
    const grid = document.querySelector('.people-grid');
    if (!grid || !window.JGGridZoom) return;
    grid.classList.add('js-zoom-grid');
    document.querySelectorAll('.person-card').forEach((card) => {
        card.classList.add('js-zoom-item');
        card.tabIndex = 0;
    });
    window.JGGridZoom.init({
        anchorSelector: '.person-image-container',
        eventName: 'people_card_open',
        grid,
        itemSelector: '.person-card',
        triggerSelector: '.person-card'
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
        useDisplayStyle: true
    });
    await loadPeopleCards();
    peopleRuntime.init();
    initPeopleZoom();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPeoplePage().catch((error) => console.error('Error loading people:', error));
    });
} else {
    initPeoplePage().catch((error) => console.error('Error loading people:', error));
}
