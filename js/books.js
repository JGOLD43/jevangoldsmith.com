const collectionUi = window.JGCollectionUI;
const collectionControllerFactory = window.JGCollectionController;
const dataFetch = window.JGDataFetch;
const booksFilters = window.JGBooksFilters;
const booksState = window.JGBooksState.create();
const booksModal = window.JGBooksModal.create({ getCoverUrl });
let booksView = null;
let collectionController = null;

async function loadBooksData() {
    if (booksState.getBooks().length > 0) {
        return booksState.getBooks();
    }

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
    return booksFilters.filterBooks(booksState.getBooks(), booksState.get());
}

function flashCategoryArrow(button, isExpanding) {
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) {
        existingArrow.remove();
    }

    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);
    window.setTimeout(() => arrow.remove(), 500);
}

function resetSidebarSelection() {
    collectionUi.collapseGroups({
        activeButton: getAllCategoryButton(),
        buttonSelector: '.sidebar-category',
        panelSelector: '.category-books'
    });
}

function renderFromState() {
    collectionController?.render();
}

function buildCollectionController() {
    collectionController = collectionControllerFactory.create({
        getState: () => booksState.get(),
        getFilteredItems: () => getFilteredBooks(),
        getVisibleItems: (filteredBooks, state) => booksFilters.getBooksForCategory(filteredBooks, state.activeCategory),
        groupItems: (filteredBooks) => booksFilters.groupBooksByCategory(filteredBooks),
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
        sidebar: {
            storageKey: 'books-sidebar-collapsed',
            layoutId: 'books-layout',
            sidebarId: 'books-sidebar',
            defaultCollapsed: true
        }
    });
}

function searchBooks(query) {
    booksState.setSearchQuery(query);
    booksState.setActiveCategory('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function clearSearch() {
    collectionController?.clearSearchInput();
    booksState.clearSearchQuery();
    booksState.setActiveCategory('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function setStarFilter(rating) {
    booksState.setStarFilter(rating);
    booksState.setActiveCategory('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function clearStarFilter() {
    booksState.clearStarFilter();
    booksState.setActiveCategory('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function setReReadsFilter(count) {
    if (count === 0) {
        booksState.clearReReadsFilter();
    } else {
        booksState.setReReadsFilter(count);
    }

    booksState.setActiveCategory('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function toggleBookCategory(category, button) {
    collectionController?.toggleGroup({
        value: category,
        button,
        onCollapse: () => {
            booksState.setActiveCategory('all');
        },
        onExpand: () => {
            flashCategoryArrow(button, true);
            booksState.setActiveCategory(category);
        }
    });
}

function toggleSidebar() {
    const isCollapsed = collectionController?.toggleSidebar();
    booksState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = collectionController?.restoreSidebar();
    booksState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    collectionController?.toggleListDropdown();
}

function setViewMode(mode) {
    booksState.setViewMode(mode);
    booksView?.setViewMode(mode);
}

function scrollToBookByTitle(bookTitle, event) {
    event?.preventDefault();
    booksView?.scrollToBookByTitle(bookTitle, event);
}

function scrollToBookByIsbn(isbn) {
    booksView?.scrollToBookByIsbn(isbn);
}

function openCategoryModal(category) {
    booksView?.openCategoryModal(category);
}

function closeCategoryModal() {
    booksView?.closeCategoryModal();
}

function openBookFromGrid(isbn) {
    booksView?.openBookFromGrid(isbn);
}

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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        buildCollectionController();
        restoreSidebarState();
        await loadBooksData();

        booksView = window.JGBooksView?.create({
            getBooks: () => booksState.getBooks(),
            getCoverUrl,
            openBookModal: booksModal.open
        }) || null;

        window.JGBooksEvents.bind({
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
    } catch (error) {
        console.error(error);
        showBooksUnavailable();
    }
});
