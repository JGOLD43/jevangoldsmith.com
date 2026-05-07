import { escapeHtml as escapeHTML, escapeAttr } from '../lib/html-escape';
import { init as initGridZoom } from './grid-zoom';
import { installImageErrorHandler, installEscapeCloser, bindStarRatingDrag } from './collection-helpers';
import { fetchJson, readInlineJson } from './data-fetch';
import { createCollectionRuntime } from './collection-runtime';
import {
    closeDropdownOnOutsideClick as closeDropdownOnOutsideClickShared,
    debounce,
    highlightAndScroll
} from './collection-ui';
// books page registers data-action handlers transitively through the
// collection runtime; importing action-dispatcher keeps the document
// listeners installed even when the runtime isn't initialized yet.
import './action-dispatcher';
// Books page orchestrator. Inlines what used to live in
// js/books-state.js, js/books-filters.js, js/books-modal.js,
// js/books-events.js, js/books-view.js — those shards only ever exported
// JG* globals consumed here, so collapsing them removes 4 globals and
// 5 round-trips through window.

// --- state ---
const booksState = (function createState() {
    const state: { activeCategory: string; books: AnyObj[]; reReadsFilter: string; searchQuery: string; sidebarCollapsed: boolean; starFilter: string; viewMode: string } = {
        activeCategory: 'all',
        books: [],
        reReadsFilter: 'all',
        searchQuery: '',
        sidebarCollapsed: true,
        starFilter: 'all',
        viewMode: 'list'
    };
    return {
        clearReReadsFilter() { state.reReadsFilter = 'all'; },
        clearSearchQuery() { state.searchQuery = ''; },
        clearStarFilter() { state.starFilter = 'all'; },
        get() { return { ...state }; },
        getBooks() { return state.books; },
        setActiveCategory(c: string) { state.activeCategory = c || 'all'; },
        setBooks(b: AnyObj[]) { state.books = Array.isArray(b) ? b : []; },
        setReReadsFilter(c: string) { state.reReadsFilter = c; },
        setSearchQuery(q: string) { state.searchQuery = String(q || '').trim(); },
        setSidebarCollapsed(v: boolean) { state.sidebarCollapsed = Boolean(v); },
        setStarFilter(r: string) { state.starFilter = r; },
        setViewMode(m: string) { state.viewMode = m || 'list'; }
    };
}());

import { CATEGORY_MAP, CATEGORY_NAME_BY_KEY } from '../lib/book-categories';

// --- filters ---
function filterBooks(books: AnyObj[], state: AnyObj): AnyObj[] {
    const query = String(state.searchQuery || '').toLowerCase();
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

// --- modal ---
function createBooksModal({ getCoverUrl }: { getCoverUrl: (b: AnyObj, size?: string) => string }) {
    function close() {
        const modal = document.getElementById('book-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    function open(book: AnyObj) {
        if (!book?.review) return false;
        const modal = document.getElementById('book-modal');
        const modalTitle = document.getElementById('modal-book-title');
        const modalAuthor = document.getElementById('modal-book-author');
        const modalCover = document.getElementById('modal-book-cover') as HTMLImageElement | null;
        const modalRating = document.getElementById('modal-book-rating');
        const modalReview = document.getElementById('modal-book-review');
        if (!modal || !modalTitle || !modalAuthor || !modalCover || !modalRating || !modalReview) return false;
        const isUnread = book.read === false;
        const stars = isUnread ? '' : '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
        const coverUrl = getCoverUrl(book);
        modalTitle.textContent = book.title;
        modalAuthor.textContent = `by ${book.author}${book.year ? ` (${book.year})` : ''}`;
        modalCover.src = coverUrl;
        modalCover.alt = book.title;
        modalCover.onerror = () => { modalCover.hidden = true; };
        modalCover.onload = () => { modalCover.hidden = false; };
        modalRating.textContent = isUnread ? 'To Read' : stars;
        modalReview.textContent = book.review;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        return true;
    }
    return { close, open };
}

// --- view ---
const categoryDisplayNames: Record<string, string> = {
    'Advertising and Copywriting': 'Advertising',
    'Astral Projection': 'Astral projection',
    'Autobiographies': 'Autobiographies',
    'Big Ideas': 'Big Ideas',
    'Copywriting': 'Copywriting',
    'The Great Books': 'The Great Books',
    'Lee Kuan Yew': 'Lee Kuan Yew',
    'Learning': 'Learning',
    'Mental Endurance': 'Mental Endurance',
    'Out of the Box Thinking': 'Out Of The Box Thinking',
    'Patience and Clear Thinking': 'Patience & Clear Thinking',
    'Persuasion': 'Persuasion',
    'Psychology Books': 'Psychology',
    'Science': 'Science',
    'Storytelling': 'Storytelling',
    'Strategy and War': 'Strategy',
    'Who Am I?': 'Who Am I?'
};

function createBooksView(controller: AnyObj) {
    let currentViewMode = 'list';

    // Astro SSRs every card at build time. Filter / search toggles each
    // card's visibility based on the matched set.
    function renderBooks(books: AnyObj[]) {
        const container = document.getElementById('books-container');
        if (!container) return;
        const visible = new Set<string>();
        for (const b of books) visible.add(b.isbn || b.title);
        for (const card of container.querySelectorAll<HTMLElement>(':scope > *')) {
            const id = card.dataset.isbn || card.dataset.title || '';
            card.style.display = visible.has(id) ? '' : 'none';
        }
    }

    function renderSidebar(categories: Record<string, AnyObj[]>) {
        // /books pre-renders the per-category lists at build time. If the
        // first category container already has children, the SSR's covered
        // sidebar + counts — leave them alone (no flicker).
        const ssrCategoryKeys = Object.keys(categories);
        const ssrAlreadyRendered = ssrCategoryKeys.some((key) => {
            const c = document.getElementById(`category-${key}`);
            return c && c.children.length > 0;
        });
        if (ssrAlreadyRendered) return;

        const countAll = document.getElementById('count-all');
        if (countAll) {
            const total = (Object.values(categories) as AnyObj[][]).reduce((sum: number, books) => sum + books.length, 0);
            countAll.textContent = String(total);
        }
        Object.keys(categories).forEach((categoryKey) => {
            const books = (categories as AnyObj)[categoryKey] as AnyObj[];
            const countElement = document.getElementById(`count-${categoryKey}`);
            const section = countElement?.closest('.sidebar-section') as HTMLElement | null;
            const container = document.getElementById(`category-${categoryKey}`);
            if (countElement) countElement.textContent = String(books.length);
            if (section) section.style.display = books.length === 0 ? 'none' : 'block';
            if (container) {
                container.innerHTML = books.map((book: AnyObj) => `
                    <a href="#" class="book-link" data-action="book-link" data-book-title="${escapeAttr(book.title)}">
                        <div>${escapeHTML(book.title)}</div>
                        <div class="book-link-author">${escapeHTML(book.author)}</div>
                    </a>
                `).join('');
            }
        });
    }

    function renderCarousel(books: AnyObj[]) {
        const track = document.getElementById('carousel-track');
        if (!track) return;
        // /books SSRs the first half of the carousel (20 cards). Clone
        // those nodes once to satisfy the seamless-scroll CSS animation
        // that translateX(-50%)s the track. Cloning runs after first
        // paint so the SSR'd images get to render immediately.
        if (track.children.length > 0) {
            const originals = Array.from(track.children);
            // Already doubled (e.g. via earlier render) — leave alone.
            if (originals.length >= 40 || track.dataset.cloned === 'true') return;
            const frag = document.createDocumentFragment();
            for (const node of originals) frag.appendChild(node.cloneNode(true));
            track.appendChild(frag);
            track.dataset.cloned = 'true';
            return;
        }
        // No SSR copy — fully render from data (legacy fallback path).
        const recentBooks = books.slice(-20).reverse();
        const carouselBooks = [...recentBooks, ...recentBooks];
        track.style.animationDuration = `${recentBooks.length * 3}s`;
        track.innerHTML = carouselBooks.map((book: AnyObj) => {
            const coverUrl = controller.getCoverUrl(book, 'medium');
            return `<img class="carousel-book" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" loading="lazy" decoding="async" data-action="carousel-book" data-isbn="${escapeAttr(book.isbn)}" data-remove-on-error="true">`;
        }).join('');
        track.dataset.cloned = 'true';
    }

    function scrollToBookByIsbn(isbn: string) {
        const bookCard = document.querySelector(`[data-isbn="${isbn}"]`) as HTMLElement | null;
        if (!bookCard) return;
        highlightAndScroll(bookCard, {
            duration: 1000,
            shadow: '0 8px 24px rgba(0,0,0,0.2)'
        });
    }

    function scrollToBookByTitle(bookTitle: string, event?: Event) {
        const bookCards = Array.from(document.querySelectorAll('.book-card')) as HTMLElement[];
        const targetCard = bookCards.find((card) => {
            const titleElement = card.querySelector('.book-title');
            return titleElement?.textContent === bookTitle;
        });
        if (!targetCard) return;
        highlightAndScroll(targetCard, {
            activeElement: (event?.target as Element | undefined)?.closest('.book-link') ?? null,
            activeSelector: '.book-link'
        });
    }

    function updateBookCount(count: number, categoryName?: string) {
        const countElement = document.getElementById('book-count');
        const labelElement = document.getElementById('counter-label');
        if (countElement) countElement.textContent = String(count);
        if (labelElement) {
            labelElement.textContent = categoryName && categoryName !== 'all'
                ? 'Books'
                : 'Total Books';
        }
    }

    function updateReReadsFilterDisplay(value: string | number) {
        const slider = document.getElementById('timesread-slider') as HTMLInputElement | null;
        const text = document.getElementById('filter-timesread-text');
        const normalizedValue = value === 'all' ? 0 : Number(value);
        if (slider) slider.value = String(normalizedValue);
        if (text) {
            text.textContent = normalizedValue > 0
                ? (normalizedValue >= 10 ? '10' : String(normalizedValue))
                : '';
        }
    }

    function updateStarFilterDisplay(value: string | number) {
        const stars = document.querySelectorAll('.filter-star');
        const text = document.getElementById('filter-rating-text');
        const valNum = value === 'all' ? Number.NaN : Number(value);
        stars.forEach((star) => {
            const starNumber = Number.parseInt(star.getAttribute('data-star') || '0', 10);
            star.classList.remove('full', 'half');
            if (value === 'all') return;
            if (starNumber <= Math.floor(valNum)) star.classList.add('full');
            else if (starNumber === Math.ceil(valNum) && valNum % 1 === 0.5) star.classList.add('half');
        });
        if (text) text.textContent = value === 'all' ? '' : `${value}+`;
    }

    function getBooksByCategory(): Record<string, AnyObj[]> {
        const categories: Record<string, AnyObj[]> = {};
        controller.getBooks().forEach((book: AnyObj) => {
            const category = book.category || 'Uncategorized';
            if (!categories[category]) categories[category] = [];
            categories[category].push(book);
        });
        return categories;
    }

    function renderCategoryGrid() {
        const container = document.getElementById('category-grid');
        if (!container) return;
        const booksByCategory = getBooksByCategory();
        const sortedCategories = (Object.entries(booksByCategory) as [string, AnyObj[]][]).sort((a, b) => b[1].length - a[1].length);
        container.innerHTML = sortedCategories.map(([category, books]: [string, AnyObj[]]) => {
            const previewBooks = books.slice(0, 8);
            const displayName = categoryDisplayNames[category] || category;
            const bookCovers = previewBooks.map((book: AnyObj) => {
                const coverUrl = controller.getCoverUrl(book, 'medium');
                return `<img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" loading="lazy" decoding="async" data-remove-on-error="true">`;
            }).join('');
            const emptySlots = Array(Math.max(0, 8 - previewBooks.length))
                .fill('<div class="empty-slot"></div>')
                .join('');
            return `
                <div class="category-card" data-action="open-category-modal" data-category="${escapeAttr(category)}">
                    <div class="category-card-books">
                        ${bookCovers}${emptySlots}
                    </div>
                    <div class="category-card-info">
                        <span class="category-card-name">${escapeHTML(displayName)}</span>
                        <span class="category-card-count">${books.length}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setViewMode(mode: string) {
        currentViewMode = mode;
        const listBtn = document.getElementById('list-view-btn');
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtnGrid = document.getElementById('list-view-btn-grid');
        const gridBtnGrid = document.getElementById('grid-view-btn-grid');
        const listBtnMain = document.getElementById('list-view-btn-main');
        const gridBtnMain = document.getElementById('grid-view-btn-main');
        const booksMain = document.querySelector('.books-main');
        const categoryGridView = document.getElementById('category-grid-view');
        const sidebar = document.getElementById('books-sidebar');
        const booksLayout = document.getElementById('books-layout');

        if (listBtn) listBtn.classList.toggle('active', mode === 'list');
        if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
        if (listBtnGrid) listBtnGrid.classList.toggle('active', mode === 'list');
        if (gridBtnGrid) gridBtnGrid.classList.toggle('active', mode === 'grid');
        if (listBtnMain) listBtnMain.classList.toggle('active', mode === 'list');
        if (gridBtnMain) gridBtnMain.classList.toggle('active', mode === 'grid');

        if (mode === 'grid') {
            if (booksMain) (booksMain as HTMLElement).style.display = 'none';
            if (categoryGridView) categoryGridView.style.display = 'block';
            if (sidebar) sidebar.style.display = 'none';
            if (booksLayout) {
                booksLayout.classList.add('grid-view-active');
                booksLayout.classList.remove('sidebar-collapsed');
            }
            renderCategoryGrid();
            return;
        }
        if (booksMain) (booksMain as HTMLElement).style.display = 'block';
        if (categoryGridView) categoryGridView.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';
        if (booksLayout) booksLayout.classList.remove('grid-view-active');
        if (sidebar?.classList.contains('collapsed')) booksLayout?.classList.add('sidebar-collapsed');
    }

    function openCategoryModal(category: string) {
        const books = getBooksByCategory()[category] || [];
        const displayName = categoryDisplayNames[category] || category;
        let modal = document.getElementById('category-expanded-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'category-expanded-modal';
            modal.className = 'category-expanded';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="category-modal-backdrop" data-action="close-category-modal"></div>
            <div class="category-modal-content">
                <div class="category-expanded-header">
                    <h2 class="category-expanded-title">${escapeHTML(displayName)}</h2>
                    <button class="category-expanded-close" data-action="close-category-modal">&times;</button>
                </div>
                <div class="category-expanded-books">
                    ${books.map((book: AnyObj) => {
                        const coverUrl = controller.getCoverUrl(book);
                        return `
                            <div class="category-expanded-book" data-action="open-book-from-grid" data-isbn="${escapeAttr(book.isbn)}">
                                <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" data-remove-on-error="true">
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCategoryModal() {
        const modal = document.getElementById('category-expanded-modal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openBookFromGrid(isbn: string) {
        const book = controller.getBooks().find((entry: AnyObj) => entry.isbn === isbn);
        if (!book) return;
        closeCategoryModal();
        controller.openBookModal(book);
    }

    return {
        closeCategoryModal,
        currentViewMode: () => currentViewMode,
        openBookFromGrid,
        openCategoryModal,
        renderCategoryGrid,
        renderBooks,
        renderCarousel,
        renderSidebar,
        scrollToBookByIsbn,
        scrollToBookByTitle,
        setViewMode,
        updateBookCount,
        updateReReadsFilterDisplay,
        updateStarFilterDisplay
    };
}

// --- events ---
function bindBooksEvents(handlers: AnyObj) {
    const {
        clearSearch, clearStarFilter, closeBookModal, closeCategoryModal,
        handleCategoryToggle, openBookFromGrid, openCategoryModal,
        scrollToBookByIsbn, scrollToBookByTitle, searchBooks,
        setReReadsFilter, setStarFilter, setViewMode,
        toggleListDropdown, toggleSidebar
    } = handlers;

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
        if (target.closest?.('[data-action="toggle-list-dropdown"]')) { toggleListDropdown(); return; }
        if (target.closest?.('[data-action="clear-search"]')) { clearSearch(); return; }
        if (target.closest?.('[data-action="clear-star-filter"]')) {
            event.preventDefault();
            clearStarFilter();
            return;
        }
        const categoryButton = target.closest?.('.sidebar-category[data-category]') as HTMLElement | null;
        if (categoryButton) {
            handleCategoryToggle(categoryButton.dataset.category || 'all', categoryButton);
            return;
        }
        const viewToggle = target.closest?.('[data-action="set-view-mode"]') as HTMLElement | null;
        if (viewToggle) { setViewMode(viewToggle.dataset.mode || 'list'); return; }
        const bookLink = target.closest?.('[data-action="book-link"]') as HTMLElement | null;
        if (bookLink) { scrollToBookByTitle(bookLink.dataset.bookTitle || '', event); return; }
        const carouselBook = target.closest?.('[data-action="carousel-book"]') as HTMLElement | null;
        if (carouselBook) { scrollToBookByIsbn(carouselBook.dataset.isbn || ''); return; }
        const categoryModal = target.closest?.('[data-action="open-category-modal"]') as HTMLElement | null;
        if (categoryModal) { openCategoryModal(categoryModal.dataset.category || ''); return; }
        if (target.closest?.('[data-action="close-category-modal"]')) { closeCategoryModal(); return; }
        const openFromGrid = target.closest?.('[data-action="open-book-from-grid"]') as HTMLElement | null;
        if (openFromGrid) openBookFromGrid(openFromGrid.dataset.isbn || '');
    });

    document.addEventListener('click', (event) => {
        closeDropdownOnOutsideClickShared('list-dropdown', event);
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

// --- orchestrator ---
import { toggleClearButton } from './collection-ui';
const booksModal = createBooksModal({ getCoverUrl });
let booksView: AnyObj = null;
let booksRuntime: AnyObj = null;

async function loadBooksData() {
    if (booksState.getBooks().length > 0) return booksState.getBooks();
    // Inline SSR fallback path — kept for the rare build that races the
    // network. Primary path is now /data/books.generated.json (immutable
    // cache via Firebase Hosting headers + prefetch hint in head).
    const inline = readInlineJson<AnyObj[]>('jg-books-data');
    if (Array.isArray(inline) && inline.length > 0) {
        booksState.setBooks(inline);
        return inline;
    }
    const data = await fetchJson('/data/books.generated.json');
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('books: runtime data missing or empty');
    }
    booksState.setBooks(data);
    return data;
}

function getCoverUrl(bookOrIsbn: AnyObj, size: string = "large") {
    if (!bookOrIsbn) return null;
    if (typeof bookOrIsbn === 'object') {
        if (size === 'medium' && bookOrIsbn.coverImageMedium) return bookOrIsbn.coverImageMedium;
        if (bookOrIsbn.coverImage) return bookOrIsbn.coverImage;
        bookOrIsbn = bookOrIsbn.isbn;
    }
    const cleanIsbn = String(bookOrIsbn).replace(/[^0-9X]/gi, '');
    return cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size === 'medium' ? 'M' : 'L'}.jpg` : null;
}

function getFilteredBooks() {
    return filterBooks(booksState.getBooks(), booksState.get());
}

function flashCategoryArrow(button: HTMLElement | null, isExpanding: boolean) {
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) existingArrow.remove();
    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);
    window.setTimeout(() => arrow.remove(), 500);
}

function renderFromState() {
    booksRuntime?.render();
}

function buildCollectionController() {
    booksRuntime = createCollectionRuntime({
        getState: () => booksState.get(),
        getFilteredItems: () => getFilteredBooks(),
        getVisibleItems: (filteredBooks: AnyObj[], state: AnyObj) => getBooksForCategory(filteredBooks, state.activeCategory),
        groupItems: (filteredBooks: AnyObj[]) => groupBooksByCategory(filteredBooks),
        renderSidebar: (groups: AnyObj) => booksView?.renderSidebar(groups),
        renderVisibleItems: (visibleBooks: AnyObj[]) => booksView?.renderBooks(visibleBooks),
        updateCount: (visibleBooks: AnyObj[], state: AnyObj) => booksView?.updateBookCount(visibleBooks.length, state.activeCategory),
        updateControls: (state: AnyObj) => {
            booksView?.updateStarFilterDisplay(state.starFilter);
            booksView?.updateReReadsFilterDisplay(state.reReadsFilter);
            toggleClearButton('search-clear-btn', Boolean(state.searchQuery));
        },
        group: {
            allButtonSelector: '.sidebar-category[data-category="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category: string) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-books'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'book-search',
        storageKey: 'books-sidebar-collapsed',
        layoutId: 'books-layout',
        sidebarId: 'books-sidebar',
        defaultCollapsed: true
    });
}

function searchBooks(query: string) {
    booksState.setSearchQuery(query);
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function clearSearch() {
    booksRuntime?.clearSearchInput();
    booksState.clearSearchQuery();
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function setStarFilter(rating: string) {
    booksState.setStarFilter(rating);
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function clearStarFilter() {
    booksState.clearStarFilter();
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function setReReadsFilter(count: string | number) {
    if (count === 0 || count === '0') booksState.clearReReadsFilter();
    else booksState.setReReadsFilter(String(count));
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function toggleBookCategory(category: string, button: HTMLElement) {
    booksRuntime?.toggleGroup({
        value: category,
        button,
        onCollapse: () => { booksState.setActiveCategory('all'); },
        onExpand: () => {
            flashCategoryArrow(button, true);
            booksState.setActiveCategory(category);
        }
    });
}

function toggleSidebar() {
    const isCollapsed = booksRuntime?.toggleSidebar();
    booksState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = booksRuntime?.restoreSidebar();
    booksState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() { booksRuntime?.toggleListDropdown(); }

function setViewMode(mode: string) {
    booksState.setViewMode(mode);
    booksView?.setViewMode(mode);
}

function scrollToBookByTitle(bookTitle: string, event?: Event) {
    event?.preventDefault();
    booksView?.scrollToBookByTitle(bookTitle, event);
}

function scrollToLinkedBook() {
    const linkedBookTitle = new URLSearchParams(window.location.search).get('book');
    if (!linkedBookTitle) return;
    scrollToBookByTitle(linkedBookTitle);
}

function scrollToBookByIsbn(isbn: string) { booksView?.scrollToBookByIsbn(isbn); }
function openCategoryModal(category: string) { booksView?.openCategoryModal(category); }
function closeCategoryModal() { booksView?.closeCategoryModal(); }
function openBookFromGrid(isbn: string) { booksView?.openBookFromGrid(isbn); }

function initBooksZoom() {
    const booksGrid = document.getElementById('books-container');
    if (!booksGrid) return;
    booksGrid.classList.add('js-zoom-grid');
    initGridZoom({
        anchorSelector: '.book-cover',
        eventName: 'book_open',
        fillH: 0.48,
        fillW: 0.56,
        grid: booksGrid,
        itemSelector: '.book-card',
        maxScale: 3.4,
        triggerSelector: '.book-card'
    });
}

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

        booksView = createBooksView({
            getBooks: () => booksState.getBooks(),
            getCoverUrl,
            openBookModal: booksModal.open
        });

        bindBooksEvents({
            clearSearch,
            clearStarFilter,
            closeBookModal: booksModal.close,
            closeCategoryModal,
            handleCategoryToggle: toggleBookCategory,
            openBookFromGrid,
            openCategoryModal,
            scrollToBookByIsbn,
            scrollToBookByTitle,
            searchBooks,
            setReReadsFilter,
            setStarFilter,
            setViewMode,
            toggleListDropdown,
            toggleSidebar
        });

        booksView?.renderCarousel(booksState.getBooks());
        renderFromState();
        initBooksZoom();
        scrollToLinkedBook();
    } catch (error) {
        console.error(error);
        showBooksUnavailable();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooksPage, { once: true });
} else {
    initBooksPage();
}

export {};
