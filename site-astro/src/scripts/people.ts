import { escapeHtml as escapeHTML, escapeAttr } from '../lib/html-escape';
const dataFetch = window.JGDataFetch as unknown as { fetchJson: (url: string, fb?: AnyObj) => Promise<AnyObj> };

let peopleRuntime: AnyObj = null;
let peopleById = new Map<string, AnyObj>();
let lastFocusedPerson: HTMLElement | null = null;

let peopleSourceFilter = 'all';

function normalizePersonName(name: unknown): string {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function sourceMatches(card: HTMLElement) {
    return peopleSourceFilter === 'all' || card.dataset.sourceType === peopleSourceFilter;
}

function updatePeopleSourceButtons() {
    document.querySelectorAll<HTMLElement>('.people-source-filter-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.actionArgs === peopleSourceFilter);
    });
}

function setText(id: string, value: unknown) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
}

function updatePeopleFilterCounts(allCards: HTMLElement[]) {
    const sourceCards = peopleSourceFilter === 'all'
        ? allCards
        : allCards.filter((card) => card.dataset.sourceType === peopleSourceFilter);
    const sourceCounts = allCards.reduce<Record<string, number>>((counts, card) => {
        const source = card.dataset.sourceType || 'nonfiction';
        counts[source] = (counts[source] || 0) + 1;
        return counts;
    }, { fiction: 0, nonfiction: 0 });
    const categoryCounts = sourceCards.reduce<Record<string, number>>((counts, card) => {
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

function applyPeopleSourceFilter({ allCards, visibleCards }: { allCards: HTMLElement[]; visibleCards: HTMLElement[] }) {
    const categorySearchVisible = new Set(visibleCards);
    const finalVisible: HTMLElement[] = [];
    allCards.forEach((card) => {
        const visible = categorySearchVisible.has(card) && sourceMatches(card);
        card.style.display = visible ? 'block' : 'none';
        if (visible) finalVisible.push(card);
    });
    setText('people-count', finalVisible.length);
    updatePeopleFilterCounts(allCards);
    updatePeopleSourceButtons();
}

function filterPeopleSource(source: string, event?: Event) {
    peopleSourceFilter = source || 'all';
    const button = (event?.target as Element | undefined)?.closest('.people-source-filter-btn');
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
    let mergedPeople: AnyObj[] = [];
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

    // peopleById is consumed by the detail modal click + keydown handlers.
    // The DOM nodes themselves carry filter/search state via data-* attrs,
    // so no separate runtime record list is needed.
    peopleById = new Map(mergedPeople.map((person) => [normalizePersonName(person.name), person]));
}

function createMediaMarkup(person: AnyObj, key: string, label: string) {
    const entries = person[key] || [];
    if (!entries.length) return '';
    return `
        <div class="person-detail-books">
            <p class="person-detail-section-label">${escapeHTML(label)}</p>
            <div class="person-detail-book-list">
                ${entries.map((item: AnyObj) => `
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

function createBooksMarkup(person: AnyObj) {
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
    (lastFocusedPerson as HTMLElement | null)?.focus?.();
    lastFocusedPerson = null;
}

function openPeopleDetail(person: AnyObj, trigger: HTMLElement | null) {
    const modal = ensurePeopleDetailModal();
    lastFocusedPerson = (trigger || document.activeElement) as HTMLElement | null;
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
    (modal.querySelector('.person-detail-close') as HTMLElement | null)?.focus?.();
}

function initPeopleDetail() {
    const grid = document.querySelector('.people-grid');
    if (!grid) return;

    grid.addEventListener('click', (event) => {
        const card = (event.target as Element | null)?.closest?.('.person-card') as HTMLElement | null;
        if (!card) return;
        const person = peopleById.get(card.dataset.personId || '');
        if (!person) return;
        openPeopleDetail(person, card);
    });

    grid.addEventListener('keydown', (event) => {
        const ke = event as KeyboardEvent;
        if (ke.key !== 'Enter' && ke.key !== ' ') return;
        const card = (event.target as Element | null)?.closest?.('.person-card') as HTMLElement | null;
        if (!card) return;
        event.preventDefault();
        const person = peopleById.get(card.dataset.personId || '');
        if (person) openPeopleDetail(person, card);
    });

    document.addEventListener('click', (event) => {
        if ((event.target as Element | null)?.closest?.('[data-action="close-person-detail"]')) closePeopleDetail();
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
