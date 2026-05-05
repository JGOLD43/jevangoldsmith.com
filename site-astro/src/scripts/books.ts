// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
// Phase 7 (slice 8): bind sanitize helpers from window so strict-mode
// ES modules resolve bare `escapeHTML`/`escapeAttr`/`sanitizeUrl`/`sanitizeHTML`
// references that the legacy classic-script code depended on.
const { escapeHTML, escapeAttr, sanitizeUrl, sanitizeHTML } = (typeof window !== "undefined" ? window : globalThis);

// Books page orchestrator. Inlines what used to live in
// js/books-state.js, js/books-filters.js, js/books-modal.js,
// js/books-events.js, js/books-view.js — those shards only ever exported
// JG* globals consumed here, so collapsing them removes 4 globals and
// 5 round-trips through window.

// --- state ---
const booksState = (function createState() {
    const state = {
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
        setActiveCategory(c) { state.activeCategory = c || 'all'; },
        setBooks(b) { state.books = Array.isArray(b) ? b : []; },
        setReReadsFilter(c) { state.reReadsFilter = c; },
        setSearchQuery(q) { state.searchQuery = String(q || '').trim(); },
        setSidebarCollapsed(v) { state.sidebarCollapsed = Boolean(v); },
        setStarFilter(r) { state.starFilter = r; },
        setViewMode(m) { state.viewMode = m || 'list'; }
    };
}());

// Phase 4 (additive): expose books-page state for future feature-module migration.
if (typeof window !== 'undefined') {
    window.BooksState = booksState;
}

// --- filters ---
const CATEGORY_MAP = {
    'Advertising and Copywriting': 'advertising',
    'Autobiographies': 'autobiographies',
    'Big Ideas': 'bigideas',
    'Learning': 'learning',
    'Mental Endurance': 'mentalendurance',
    'Out of the Box Thinking': 'outofthebox',
    'Patience and Clear Thinking': 'patience',
    'Persuasion': 'persuasion',
    'Psychology Books': 'psychology',
    'Science': 'science',
    'Storytelling': 'storytelling',
    'Strategy and War': 'strategy',
    'The Great Books': 'greatbooks',
    'Who Am I?': 'whoami'
};
const CATEGORY_NAME_BY_KEY = Object.entries(CATEGORY_MAP).reduce((lookup, [name, key]) => {
    lookup[key] = name;
    return lookup;
}, {});

function filterBooks(books, state) {
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

function getBooksForCategory(books, categoryKey) {
    if (categoryKey === 'all') return books;
    const categoryName = CATEGORY_NAME_BY_KEY[categoryKey];
    if (!categoryName) return [];
    return books.filter((book) => book.category === categoryName);
}

function groupBooksByCategory(books) {
    const groups = Object.values(CATEGORY_MAP).reduce((memo, key) => {
        memo[key] = [];
        return memo;
    }, {});
    books.forEach((book) => {
        const categoryKey = CATEGORY_MAP[book.category];
        if (categoryKey && groups[categoryKey]) groups[categoryKey].push(book);
    });
    return groups;
}

// --- modal ---
function createBooksModal({ getCoverUrl }) {
    function close() {
        const modal = document.getElementById('book-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    function open(book) {
        if (!book?.review) return false;
        const modal = document.getElementById('book-modal');
        const modalTitle = document.getElementById('modal-book-title');
        const modalAuthor = document.getElementById('modal-book-author');
        const modalCover = document.getElementById('modal-book-cover');
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
const categoryDisplayNames = {
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

function createBooksView(controller) {
    let currentViewMode = 'list';

    // Phase B follow-up: Astro SSRs every card at build time, so the page
    // ships with all 122 cards already in the DOM. Filter / search no longer
    // re-renders; it toggles each card's visibility based on the matched
    // set. createBookCard() is deleted entirely (~50 lines), shrinking the
    // page-books bundle by ~3KB minified.
    function renderBooks(books) {
        const container = document.getElementById('books-container');
        if (!container) return;
        const visible = new Set();
        for (const b of books) visible.add(b.isbn || b.title);
        for (const card of container.children) {
            const id = card.dataset.isbn || card.dataset.title;
            card.style.display = visible.has(id) ? '' : 'none';
        }
    }

    function renderSidebar(categories) {
        const countAll = document.getElementById('count-all');
        if (countAll) {
            const total = Object.values(categories).reduce((sum, books) => sum + books.length, 0);
            countAll.textContent = total;
        }
        Object.keys(categories).forEach((categoryKey) => {
            const books = categories[categoryKey];
            const countElement = document.getElementById(`count-${categoryKey}`);
            const section = countElement?.closest('.sidebar-section');
            const container = document.getElementById(`category-${categoryKey}`);
            if (countElement) countElement.textContent = books.length;
            if (section) section.style.display = books.length === 0 ? 'none' : 'block';
            if (container) {
                container.innerHTML = books.map((book) => `
                    <a href="#" class="book-link" data-action="book-link" data-book-title="${escapeAttr(book.title)}">
                        <div>${escapeHTML(book.title)}</div>
                        <div class="book-link-author">${escapeHTML(book.author)}</div>
                    </a>
                `).join('');
            }
        });
    }

    function renderCarousel(books) {
        const track = document.getElementById('carousel-track');
        if (!track) return;
        const recentBooks = books.slice(-20).reverse();
        const carouselBooks = [...recentBooks, ...recentBooks];
        track.style.animationDuration = `${recentBooks.length * 3}s`;
        track.innerHTML = carouselBooks.map((book) => {
            const coverUrl = controller.getCoverUrl(book, 'medium');
            return `<img class="carousel-book" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" data-action="carousel-book" data-isbn="${escapeAttr(book.isbn)}" data-remove-on-error="true">`;
        }).join('');
    }

    function scrollToBookByIsbn(isbn) {
        const bookCard = document.querySelector(`[data-isbn="${isbn}"]`);
        if (!bookCard) return;
        window.JGCollectionUI.highlightAndScroll(bookCard, {
            duration: 1000,
            shadow: '0 8px 24px rgba(0,0,0,0.2)'
        });
    }

    function scrollToBookByTitle(bookTitle, event) {
        const bookCards = Array.from(document.querySelectorAll('.book-card'));
        const targetCard = bookCards.find((card) => {
            const titleElement = card.querySelector('.book-title');
            return titleElement?.textContent === bookTitle;
        });
        if (!targetCard) return;
        window.JGCollectionUI.highlightAndScroll(targetCard, {
            activeElement: event?.target?.closest('.book-link'),
            activeSelector: '.book-link'
        });
    }

    function updateBookCount(count, categoryName) {
        const countElement = document.getElementById('book-count');
        const labelElement = document.getElementById('counter-label');
        if (countElement) countElement.textContent = count;
        if (labelElement) {
            labelElement.textContent = categoryName && categoryName !== 'all'
                ? 'Books'
                : 'Total Books';
        }
    }

    function updateReReadsFilterDisplay(value) {
        const slider = document.getElementById('timesread-slider');
        const text = document.getElementById('filter-timesread-text');
        const normalizedValue = value === 'all' ? 0 : Number(value);
        if (slider) slider.value = normalizedValue;
        if (text) {
            text.textContent = normalizedValue > 0
                ? (normalizedValue >= 10 ? '10' : String(normalizedValue))
                : '';
        }
    }

    function updateStarFilterDisplay(value) {
        const stars = document.querySelectorAll('.filter-star');
        const text = document.getElementById('filter-rating-text');
        stars.forEach((star) => {
            const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
            star.classList.remove('full', 'half');
            if (value === 'all') return;
            if (starNumber <= Math.floor(value)) star.classList.add('full');
            else if (starNumber === Math.ceil(value) && value % 1 === 0.5) star.classList.add('half');
        });
        if (text) text.textContent = value === 'all' ? '' : `${value}+`;
    }

    function getBooksByCategory() {
        const categories = {};
        controller.getBooks().forEach((book) => {
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
        const sortedCategories = Object.entries(booksByCategory).sort((a, b) => b[1].length - a[1].length);
        container.innerHTML = sortedCategories.map(([category, books]) => {
            const previewBooks = books.slice(0, 8);
            const displayName = categoryDisplayNames[category] || category;
            const bookCovers = previewBooks.map((book) => {
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

    function setViewMode(mode) {
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
            if (booksMain) booksMain.style.display = 'none';
            if (categoryGridView) categoryGridView.style.display = 'block';
            if (sidebar) sidebar.style.display = 'none';
            if (booksLayout) {
                booksLayout.classList.add('grid-view-active');
                booksLayout.classList.remove('sidebar-collapsed');
            }
            renderCategoryGrid();
            return;
        }
        if (booksMain) booksMain.style.display = 'block';
        if (categoryGridView) categoryGridView.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';
        if (booksLayout) booksLayout.classList.remove('grid-view-active');
        if (sidebar?.classList.contains('collapsed')) booksLayout?.classList.add('sidebar-collapsed');
    }

    function openCategoryModal(category) {
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
                    ${books.map((book) => {
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

    function openBookFromGrid(isbn) {
        const book = controller.getBooks().find((entry) => entry.isbn === isbn);
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
function bindBooksEvents(handlers) {
    const {
        clearSearch, clearStarFilter, closeBookModal, closeCategoryModal,
        handleCategoryToggle, openBookFromGrid, openCategoryModal,
        scrollToBookByIsbn, scrollToBookByTitle, searchBooks,
        setReReadsFilter, setStarFilter, setViewMode,
        toggleListDropdown, toggleSidebar
    } = handlers;
    const helpers = window.JGCollectionHelpers;

    helpers.installImageErrorHandler();
    helpers.installEscapeCloser(closeBookModal);
    helpers.installEscapeCloser(closeCategoryModal);

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('book-modal');
        if (event.target === modal) { closeBookModal(); return; }
        if (event.target.closest('[data-action="close-book-modal"]')) { closeBookModal(); return; }
        if (event.target.closest('[data-action="toggle-sidebar"]')) { toggleSidebar(); return; }
        if (event.target.closest('[data-action="toggle-list-dropdown"]')) { toggleListDropdown(); return; }
        if (event.target.closest('[data-action="clear-search"]')) { clearSearch(); return; }
        if (event.target.closest('[data-action="clear-star-filter"]')) {
            event.preventDefault();
            clearStarFilter();
            return;
        }
        const categoryButton = event.target.closest('.sidebar-category[data-category]');
        if (categoryButton) {
            handleCategoryToggle(categoryButton.dataset.category || 'all', categoryButton);
            return;
        }
        const viewToggle = event.target.closest('[data-action="set-view-mode"]');
        if (viewToggle) { setViewMode(viewToggle.dataset.mode || 'list'); return; }
        const bookLink = event.target.closest('[data-action="book-link"]');
        if (bookLink) { scrollToBookByTitle(bookLink.dataset.bookTitle || '', event); return; }
        const carouselBook = event.target.closest('[data-action="carousel-book"]');
        if (carouselBook) { scrollToBookByIsbn(carouselBook.dataset.isbn || ''); return; }
        const categoryModal = event.target.closest('[data-action="open-category-modal"]');
        if (categoryModal) { openCategoryModal(categoryModal.dataset.category || ''); return; }
        if (event.target.closest('[data-action="close-category-modal"]')) { closeCategoryModal(); return; }
        const openFromGrid = event.target.closest('[data-action="open-book-from-grid"]');
        if (openFromGrid) openBookFromGrid(openFromGrid.dataset.isbn || '');
    });

    document.addEventListener('click', (event) => {
        window.JGCollectionUI.closeDropdownOnOutsideClick('list-dropdown', event);
    });

    const searchInput = document.getElementById('book-search');
    if (searchInput) {
        const debouncedSearch = window.JGCollectionUI.debounce((value) => searchBooks(value), 120);
        searchInput.addEventListener('input', () => debouncedSearch(searchInput.value));
    }

    const slider = document.getElementById('timesread-slider');
    if (slider) {
        slider.addEventListener('input', (event) => {
            const count = Number.parseInt(event.target.value, 10);
            setReReadsFilter(count);
        });
    }

    helpers.bindStarRatingDrag(
        document.getElementById('star-filter-container'),
        setStarFilter,
        { halfStars: true }
    );
}

// --- orchestrator ---
const collectionUi = window.JGCollectionUI;
const dataFetch = window.JGDataFetch;
const booksModal = createBooksModal({ getCoverUrl });
let booksView = null;
let booksRuntime = null;

async function loadBooksData() {
    if (booksState.getBooks().length > 0) return booksState.getBooks();
    const books = await dataFetch.fetchJsonWithFallback(['data/books.generated.json', 'data/books.json']);
    booksState.setBooks(books);
    return books;
}

function getCoverUrl(bookOrIsbn, size = 'large') {
    if (!bookOrIsbn) return null;
    if (typeof bookOrIsbn === 'object') {
        if (size === 'medium' && bookOrIsbn.coverImageMedium) return bookOrIsbn.coverImageMedium;
        if (bookOrIsbn.coverImage) return bookOrIsbn.coverImage;
        bookOrIsbn = bookOrIsbn.isbn;
    }
    const cleanIsbn = String(bookOrIsbn).replace(/[^0-9X]/gi, '');
    return cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size === 'medium' ? 'M' : 'L'}.jpg` : null;
}

function getAllCategoryButton() {
    return document.querySelector('.sidebar-category[data-category="all"]');
}

function getFilteredBooks() {
    return filterBooks(booksState.getBooks(), booksState.get());
}

function flashCategoryArrow(button, isExpanding) {
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
    booksRuntime = window.JGCollectionRuntime.create({
        getState: () => booksState.get(),
        getFilteredItems: () => getFilteredBooks(),
        getVisibleItems: (filteredBooks, state) => getBooksForCategory(filteredBooks, state.activeCategory),
        groupItems: (filteredBooks) => groupBooksByCategory(filteredBooks),
        renderSidebar: (groups) => booksView?.renderSidebar(groups),
        renderVisibleItems: (visibleBooks) => booksView?.renderBooks(visibleBooks),
        updateCount: (visibleBooks, state) => booksView?.updateBookCount(visibleBooks.length, state.activeCategory),
        updateControls: (state) => {
            booksView?.updateStarFilterDisplay(state.starFilter);
            booksView?.updateReReadsFilterDisplay(state.reReadsFilter);
            collectionUi.toggleClearButton('search-clear-btn', Boolean(state.searchQuery));
        },
        group: {
            allButtonSelector: '.sidebar-category[data-category="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category) => category === 'all' ? null : document.getElementById(`category-${category}`),
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

function searchBooks(query) {
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

function setStarFilter(rating) {
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

function setReReadsFilter(count) {
    if (count === 0) booksState.clearReReadsFilter();
    else booksState.setReReadsFilter(count);
    booksState.setActiveCategory('all');
    booksRuntime?.resetGrouping();
    renderFromState();
}

function toggleBookCategory(category, button) {
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

function setViewMode(mode) {
    booksState.setViewMode(mode);
    booksView?.setViewMode(mode);
}

function scrollToBookByTitle(bookTitle, event) {
    event?.preventDefault();
    booksView?.scrollToBookByTitle(bookTitle, event);
}

function scrollToLinkedBook() {
    const linkedBookTitle = new URLSearchParams(window.location.search).get('book');
    if (!linkedBookTitle) return;
    scrollToBookByTitle(linkedBookTitle);
}

function scrollToBookByIsbn(isbn) { booksView?.scrollToBookByIsbn(isbn); }
function openCategoryModal(category) { booksView?.openCategoryModal(category); }
function closeCategoryModal() { booksView?.closeCategoryModal(); }
function openBookFromGrid(isbn) { booksView?.openBookFromGrid(isbn); }

function initBooksZoom() {
    const booksGrid = document.getElementById('books-container');
    if (!booksGrid || !window.JGGridZoom) return;
    booksGrid.classList.add('js-zoom-grid');
    window.JGGridZoom.init({
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
