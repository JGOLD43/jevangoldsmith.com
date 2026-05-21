import { CATEGORY_MAP, CATEGORY_NAME_BY_KEY } from '../lib/book-categories';
import { debounce } from '../lib/debounce';
import './action-dispatcher';
import { bindStarRatingDrag, installEscapeCloser, installImageErrorHandler } from './collection-helpers';
import { createCollectionRuntime } from './collection-runtime';
import { closeDropdownOnOutsideClick, toggleClearButton } from './collection-ui';
import { fetchJson, readInlineJson } from './data-fetch';
import { onDomReady } from './dom-ready';
import { booksRuntime, setBooksRuntime, state } from './books-state';
import { LOCAL_KEYS } from './storage-keys';
import {
    flashCategoryArrow,
    renderBooks,
    renderCarousel,
    renderSidebar,
    scrollToBookByTitle,
    setViewMode,
    updateBookCount,
    updateReReadsFilterDisplay,
    updateStarFilterDisplay
} from './books-render';
import {
    closeBookModal,
    closeCategoryModal,
    openBookFromGrid,
    openCategoryModal
} from './books-modal';
import { initBooksZoom, installBookFlightPopstate } from './books-flight';

// --- filters ---
function filterBooks(books: AnyObj[]): AnyObj[] {
    const query = state.searchQuery.toLowerCase();
    return books.filter((book) => {
        const isUnread = book.read === false;
        const ratingValue = Number(book.rating || 0);
        if (query) {
            const matchesQuery = [book.title, book.author, book.category || '']
                .some((value) => String(value).toLowerCase().includes(query));
            if (!matchesQuery) return false;
        }
        if (state.starFilter !== 'all') {
            if (isUnread || ratingValue <= 0) return false;
            if (ratingValue < Number(state.starFilter)) return false;
        }
        if (state.reReadsFilter !== 'all') {
            if (isUnread) return false;
            if (Number(book.reReads || 0) < Number(state.reReadsFilter)) return false;
        }
        return true;
    });
}

function getBooksForCategory(books: AnyObj[], categoryKey: string) {
    if (categoryKey === 'all') return books;
    const categoryName = CATEGORY_NAME_BY_KEY[categoryKey];
    if (!categoryName) return [];
    return books.filter((book) => book.category === categoryName);
}

function groupBooksByCategory(books: AnyObj[]): Record<string, AnyObj[]> {
    const groups: Record<string, AnyObj[]> = Object.fromEntries(
        Object.values(CATEGORY_MAP).map((key) => [key, []])
    );
    books.forEach((book) => {
        const categoryKey = CATEGORY_MAP[book.category];
        if (categoryKey && groups[categoryKey]) groups[categoryKey].push(book);
    });
    return groups;
}

// --- runtime ---
async function loadBooksData() {
    if (state.books.length > 0) return state.books;
    // books.astro emits the full runtime payload as inline JSON so first-
    // paint avoids a network round-trip. Fetch path retained as a fallback
    // for builds that ever skip the inline emit.
    const inline = readInlineJson<AnyObj[]>('jg-books-data');
    if (Array.isArray(inline) && inline.length > 0) {
        state.books = inline;
        return inline;
    }
    const data = await fetchJson('/data/books.generated.json');
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('books: runtime data missing or empty');
    }
    state.books = data;
    return data;
}

function renderFromState() { booksRuntime?.render(); }

function buildCollectionController() {
    setBooksRuntime(createCollectionRuntime({
        getState: () => ({ ...state }),
        getFilteredItems: () => filterBooks(state.books),
        getVisibleItems: (filteredBooks: AnyObj[], s: AnyObj) => getBooksForCategory(filteredBooks, s.activeCategory),
        groupItems: (filteredBooks: AnyObj[]) => groupBooksByCategory(filteredBooks),
        renderSidebar,
        renderVisibleItems: renderBooks,
        updateCount: (visibleBooks: AnyObj[], s: AnyObj) => updateBookCount(visibleBooks.length, s.activeCategory),
        updateControls: (s: AnyObj) => {
            updateStarFilterDisplay(s.starFilter);
            updateReReadsFilterDisplay(s.reReadsFilter);
            toggleClearButton('search-clear-btn', Boolean(s.searchQuery));
        },
        group: {
            allButtonSelector: '.sidebar-category[data-category="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category: string) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-books'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'book-search',
        storageKey: LOCAL_KEYS.booksSidebar,
        layoutId: 'books-layout',
        sidebarId: 'books-sidebar',
        defaultCollapsed: true
    }));
}

// Apply a state mutation, reset to "all" category, and re-render. Every
// filter-change action funnels through here so the four-step incantation
// (mutate, reset category, reset grouping, render) lives in one place.
function applyFilter(mutate: () => void) {
    mutate();
    state.activeCategory = 'all';
    booksRuntime?.resetGrouping();
    renderFromState();
}

function searchBooks(query: string) {
    applyFilter(() => { state.searchQuery = String(query || '').trim(); });
}

function clearSearch() {
    booksRuntime?.clearSearchInput();
    applyFilter(() => { state.searchQuery = ''; });
}

function setStarFilter(rating: string | number) {
    applyFilter(() => { state.starFilter = String(rating); });
}

function clearStarFilter() {
    applyFilter(() => { state.starFilter = 'all'; });
}

function setReReadsFilter(count: string | number) {
    applyFilter(() => {
        state.reReadsFilter = (count === 0 || count === '0') ? 'all' : String(count);
    });
}

function toggleBookCategory(category: string, button: HTMLElement) {
    booksRuntime?.toggleGroup({
        value: category,
        button,
        onCollapse: () => { state.activeCategory = 'all'; },
        onExpand: () => {
            flashCategoryArrow(button, true);
            state.activeCategory = category;
        }
    });
}

function toggleSidebar() {
    state.sidebarCollapsed = Boolean(booksRuntime?.toggleSidebar());
}

function restoreSidebarState() {
    state.sidebarCollapsed = Boolean(booksRuntime?.restoreSidebar());
}

function scrollToLinkedBook() {
    const linkedBookTitle = new URLSearchParams(window.location.search).get('book');
    if (linkedBookTitle) scrollToBookByTitle(linkedBookTitle);
}

// --- events ---
function bindBooksEvents() {
    installImageErrorHandler();
    installEscapeCloser(closeBookModal);
    installEscapeCloser(closeCategoryModal);

    document.addEventListener('click', (event: Event) => {
        const target = event.target as Element | null;
        if (!target) return;
        const modal = document.getElementById('book-modal');
        if (event.target === modal) { closeBookModal(); return; }
        if (target.closest?.('[data-action="close-book-modal"]')) { closeBookModal(); return; }
        if (target.closest?.('[data-action="toggle-sidebar"]')) { toggleSidebar(); return; }
        if (target.closest?.('[data-action="toggle-list-dropdown"]')) { booksRuntime?.toggleListDropdown(); return; }
        if (target.closest?.('[data-action="clear-search"]')) { clearSearch(); return; }
        if (target.closest?.('[data-action="clear-star-filter"]')) {
            event.preventDefault();
            clearStarFilter();
            return;
        }
        const categoryButton = target.closest?.('.sidebar-category[data-category]') as HTMLElement | null;
        if (categoryButton) {
            toggleBookCategory(categoryButton.dataset.category || 'all', categoryButton);
            return;
        }
        const viewToggle = target.closest?.('[data-action="set-view-mode"]') as HTMLElement | null;
        if (viewToggle) { setViewMode(viewToggle.dataset.mode || 'list'); return; }
        const viewToggleSingle = target.closest?.('[data-action="toggle-view-mode"]') as HTMLElement | null;
        if (viewToggleSingle) {
            setViewMode(state.viewMode === 'list' ? 'grid' : 'list');
            return;
        }
        const bookLink = target.closest?.('[data-action="book-link"]') as HTMLElement | null;
        if (bookLink) {
            event.preventDefault();
            scrollToBookByTitle(bookLink.dataset.bookTitle || '', event);
            return;
        }
        const categoryModal = target.closest?.('[data-action="open-category-modal"]') as HTMLElement | null;
        if (categoryModal) { openCategoryModal(categoryModal.dataset.category || ''); return; }
        if (target.closest?.('[data-action="close-category-modal"]')) { closeCategoryModal(); return; }
        const openFromGrid = target.closest?.('[data-action="open-book-from-grid"]') as HTMLElement | null;
        if (openFromGrid) openBookFromGrid(openFromGrid.dataset.isbn || '');
    });

    document.addEventListener('click', (event) => {
        closeDropdownOnOutsideClick('list-dropdown', event);
    });

    const searchInput = document.getElementById('book-search') as HTMLInputElement | null;
    if (searchInput) {
        const debouncedSearch = debounce((value: string) => searchBooks(value), 120);
        searchInput.addEventListener('input', () => debouncedSearch(searchInput.value));
    }

    const slider = document.getElementById('timesread-slider');
    if (slider) {
        slider.addEventListener('input', (event: Event) => {
            const count = Number.parseInt((event.target as HTMLInputElement).value, 10);
            setReReadsFilter(count);
        });
    }

    bindStarRatingDrag(
        document.getElementById('star-filter-container'),
        setStarFilter,
        { halfStars: true }
    );
}

installBookFlightPopstate();

function showBooksUnavailable() {
    const container = document.getElementById('books-container');
    if (container) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">Books are unavailable right now.</p>';
    }
}

async function initBooksPage() {
    try {
        buildCollectionController();
        restoreSidebarState();
        await loadBooksData();
        bindBooksEvents();
        renderCarousel(state.books);
        renderFromState();
        initBooksZoom();
        scrollToLinkedBook();
    } catch (error) {
        console.error(error);
        showBooksUnavailable();
    }
}

onDomReady(initBooksPage, 'books init');
