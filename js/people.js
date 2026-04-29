const collectionUi = window.JGCollectionUI;
const collectionControllerFactory = window.JGCollectionController;
const dataFetch = window.JGDataFetch;

const peopleState = {
    activeCategory: 'all',
    searchQuery: '',
    sidebarCollapsed: true
};

let peopleCards = [];
let collectionController = null;

function createPersonCard(person) {
    const article = document.createElement('article');
    article.className = 'person-card js-zoom-item';
    article.dataset.category = person.category || '';
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

function getState() {
    return { ...peopleState };
}

function getFilteredPeople() {
    return peopleCards.filter(({ category, searchText }) => {
        const categoryMatches = peopleState.activeCategory === 'all' || category === peopleState.activeCategory;
        const searchMatches = !peopleState.searchQuery || searchText.includes(peopleState.searchQuery);
        return categoryMatches && searchMatches;
    });
}

function renderPeople(visiblePeople) {
    const visibleCards = new Set(visiblePeople.map(({ card }) => card));
    peopleCards.forEach(({ card }) => {
        card.style.display = visibleCards.has(card) ? 'block' : 'none';
    });
}

function updatePeopleCount(visiblePeople) {
    const count = document.getElementById('people-count');
    if (count) count.textContent = visiblePeople.length;
}

function buildCollectionController() {
    collectionController = collectionControllerFactory.create({
        getState,
        getFilteredItems: () => getFilteredPeople(),
        renderVisibleItems: renderPeople,
        updateCount: updatePeopleCount,
        updateControls: (state) => collectionUi.toggleClearButton('people-search-clear-btn', Boolean(state.searchQuery), 'block'),
        group: {
            allButtonSelector: '[data-action="filterByCategory"][data-action-args="all"]',
            buttonSelector: '.sidebar-category'
        },
        searchClearButtonId: 'people-search-clear-btn',
        searchInputId: 'people-search',
        sidebar: {
            storageKey: 'people-sidebar-collapsed',
            layoutId: 'people-layout',
            sidebarId: 'people-sidebar',
            defaultCollapsed: true
        }
    });
}

function filterByCategory(category, event) {
    peopleState.activeCategory = category || 'all';

    const buttons = Array.from(document.querySelectorAll('.sidebar-category'));
    const button = event?.target?.closest('.sidebar-category');
    if (peopleState.activeCategory === 'all') {
        collectionController?.resetGrouping();
    } else {
        collectionUi.activateOnly(buttons, button);
    }

    collectionController?.render();
}

const filterPeople = collectionUi.debounce((searchTerm) => {
    peopleState.searchQuery = String(searchTerm || '').trim().toLowerCase();
    peopleState.activeCategory = 'all';
    collectionController?.resetGrouping();
    collectionController?.render();
});

function clearPeopleSearch() {
    collectionController?.clearSearchInput();
    peopleState.searchQuery = '';
    peopleState.activeCategory = 'all';
    collectionController?.resetGrouping();
    collectionController?.render();
}

function togglePeopleSidebar() {
    const isCollapsed = collectionController?.toggleSidebar();
    peopleState.sidebarCollapsed = Boolean(isCollapsed);
}

function restorePeopleSidebar() {
    const isCollapsed = collectionController?.restoreSidebar();
    peopleState.sidebarCollapsed = Boolean(isCollapsed);
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

window.filterByCategory = filterByCategory;
window.filterPeople = filterPeople;
window.clearPeopleSearch = clearPeopleSearch;
window.togglePeopleSidebar = togglePeopleSidebar;

async function initPeoplePage() {
    buildCollectionController();
    restorePeopleSidebar();
    await loadPeopleCards();
    collectionController?.render();
    initPeopleZoom();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPeoplePage().catch((error) => console.error('Error loading people:', error));
    });
} else {
    initPeoplePage().catch((error) => console.error('Error loading people:', error));
}
