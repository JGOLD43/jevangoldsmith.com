import { bookCoverUrl } from '../lib/book-card';
import { CATEGORY_MAP, CATEGORY_NAME_BY_KEY } from '../lib/book-categories';
import { debounce } from '../lib/debounce';
import { escapeAttr, escapeHtml } from '../lib/html-escape';
import { slugify } from '../lib/slug';
import './action-dispatcher';
import { applyCardVisibility, bindStarRatingDrag, installEscapeCloser, installImageErrorHandler } from './collection-helpers';
import { createCollectionRuntime } from './collection-runtime';
import {
    closeDropdownOnOutsideClick,
    highlightAndScroll,
    toggleClearButton
} from './collection-ui';
import { fetchJson, readInlineJson } from './data-fetch';
import { onDomReady } from './dom-ready';
import { init as initGridZoom } from './grid-zoom';

// --- state ---
const state = {
    activeCategory: 'all',
    books: [] as AnyObj[],
    reReadsFilter: 'all' as string,
    searchQuery: '',
    sidebarCollapsed: true,
    starFilter: 'all' as string,
    viewMode: 'list'
};

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

// --- modal ---
function openBookModal(book: AnyObj) {
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

function closeBookModal() {
    const modal = document.getElementById('book-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
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

function renderBooks(books: AnyObj[]) {
    const container = document.getElementById('books-container');
    const visible = new Set<string>(books.map((b) => b.isbn || b.title));
    applyCardVisibility(
        container,
        visible,
        ':scope > *',
        (card) => [card.dataset.isbn || '', card.dataset.title || '']
    );
}

function renderSidebar(categories: Record<string, AnyObj[]>) {
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
        const books = categories[categoryKey];
        const countElement = document.getElementById(`count-${categoryKey}`);
        const section = countElement?.closest('.sidebar-section') as HTMLElement | null;
        const container = document.getElementById(`category-${categoryKey}`);
        if (countElement) countElement.textContent = String(books.length);
        if (section) section.style.display = books.length === 0 ? 'none' : 'block';
        if (container) {
            container.innerHTML = books.map((book: AnyObj) => {
                const cover = getCoverUrl(book, 'medium');
                const coverImg = cover
                    ? `<img class="book-link-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" decoding="async" data-remove-on-error="true">`
                    : '<span class="book-link-cover book-link-cover-fallback" aria-hidden="true"></span>';
                const slug = book.isbn || slugify(`${book.title}-${book.author}`);
                const href = slug ? `/books/${slug}.html` : '#';
                return `
                <a href="${escapeAttr(href)}" class="book-link" data-book-title="${escapeAttr(book.title)}">
                    ${coverImg}
                    <span class="book-link-meta">
                        <span class="book-link-title">${escapeHtml(book.title)}</span>
                        <span class="book-link-author">${escapeHtml(book.author)}</span>
                    </span>
                </a>`;
            }).join('');
        }
    });
}

function renderCarousel(books: AnyObj[]) {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    if (track.children.length > 0) {
        const originals = Array.from(track.children);
        if (originals.length >= 40 || track.dataset.cloned === 'true') {
            attachCarouselDrag(track);
            return;
        }
        const frag = document.createDocumentFragment();
        for (const node of originals) frag.appendChild(node.cloneNode(true));
        track.appendChild(frag);
        track.dataset.cloned = 'true';
        attachCarouselDrag(track);
        return;
    }
    const recentBooks = books.slice(-20).reverse();
    const carouselBooks = [...recentBooks, ...recentBooks];
    track.style.animationDuration = `${recentBooks.length * 3}s`;
    track.innerHTML = carouselBooks.map((book: AnyObj) => {
        const coverUrl = getCoverUrl(book, 'medium');
        const slug = book.isbn || slugify(`${book.title}-${book.author}`);
        const href = slug ? `/books/${slug}.html` : '#';
        return `<a class="carousel-book-link" href="${escapeAttr(href)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}"><img class="carousel-book" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" loading="lazy" decoding="async" data-isbn="${escapeAttr(book.isbn)}" data-remove-on-error="true"></a>`;
    }).join('');
    track.dataset.cloned = 'true';
    attachCarouselDrag(track);
}

// Click-and-drag (mouse + touch) on the recent-books carousel.
// While dragging we pause the CSS auto-scroll animation and translate the
// track via inline transform. On release we resume the animation, using a
// negative animation-delay so the loop picks up at the user's offset.
function attachCarouselDrag(track: HTMLElement) {
    if (track.dataset.dragInstalled === 'true') return;
    track.dataset.dragInstalled = 'true';

    let pointerId: number | null = null;
    let startX = 0;
    let startOffset = 0; // px translateX at drag start
    const DRAG_THRESHOLD = 4;
    let armed = false; // crossed threshold → real drag (not a click)

    function currentTranslateX(): number {
        // Prefer inline transform; otherwise read computed (animation in progress).
        const inline = track.style.transform;
        if (inline) {
            const m = /translate(?:X|3d)?\(\s*(-?\d+(?:\.\d+)?)/.exec(inline);
            if (m) return parseFloat(m[1]);
        }
        const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
        return matrix.m41 || 0;
    }

    function resumeAt(offsetPx: number) {
        // The animation runs 0 → -50% (half track width). Use negative delay
        // to start the next iteration at the dragged offset.
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth <= 0) return;
        const progress = Math.min(1, Math.max(0, -offsetPx / halfWidth));
        const duration = parseFloat(getComputedStyle(track).animationDuration) || 20;
        track.style.transform = '';
        track.style.animationDelay = `-${progress * duration}s`;
    }

    function onPointerDown(event: PointerEvent) {
        if (event.button !== undefined && event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startOffset = currentTranslateX();
        armed = false;
        // Freeze at current position immediately.
        track.style.transform = `translateX(${startOffset}px)`;
        track.style.animationPlayState = 'paused';
        track.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
        if (pointerId === null || event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        if (!armed) {
            if (Math.abs(dx) < DRAG_THRESHOLD) return;
            armed = true;
            track.classList.add('is-dragging');
        }
        let next = startOffset + dx;
        // Constrain to one loop's worth so we don't drift off the cloned set.
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0) {
            // Allow free drag but normalize into [-halfWidth, 0] for resume.
            while (next > 0) next -= halfWidth;
            while (next < -halfWidth) next += halfWidth;
        }
        track.style.transform = `translateX(${next}px)`;
    }

    function onPointerUp(event: PointerEvent) {
        if (pointerId === null || event.pointerId !== pointerId) return;
        const wasDragging = armed;
        pointerId = null;
        armed = false;
        track.classList.remove('is-dragging');
        if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        const finalOffset = currentTranslateX();
        resumeAt(finalOffset);
        track.style.animationPlayState = '';
        // Swallow the click that fires after a real drag so we don't follow the link.
        if (wasDragging) {
            const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
            track.addEventListener('click', swallow, { capture: true, once: true });
        }
    }

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerUp);
    track.addEventListener('pointercancel', onPointerUp);
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
    const titleElement = document.getElementById('collection-title');
    if (countElement) countElement.textContent = String(count);
    if (labelElement) {
        labelElement.textContent = categoryName && categoryName !== 'all' ? 'Books' : 'Total Books';
    }
    if (titleElement) {
        const fullName = categoryName && categoryName !== 'all' ? CATEGORY_NAME_BY_KEY[categoryName] : '';
        const display = fullName ? (categoryDisplayNames[fullName] ?? fullName) : '';
        titleElement.textContent = display || titleElement.dataset.defaultTitle || titleElement.textContent || '';
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
    state.books.forEach((book: AnyObj) => {
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
    container.innerHTML = sortedCategories.map(([category, books]) => {
        const previewBooks = books.slice(0, 8);
        const displayName = categoryDisplayNames[category] || category;
        const bookCovers = previewBooks.map((book: AnyObj) => {
            const coverUrl = getCoverUrl(book, 'medium');
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
                    <span class="category-card-name">${escapeHtml(displayName)}</span>
                    <span class="category-card-count">${books.length}</span>
                </div>
            </div>
        `;
    }).join('');
}

function setViewMode(mode: string) {
    state.viewMode = mode || 'list';
    const ids = ['list-view-btn', 'list-view-btn-grid', 'list-view-btn-main'];
    const grids = ['grid-view-btn', 'grid-view-btn-grid', 'grid-view-btn-main'];
    ids.forEach((id) => document.getElementById(id)?.classList.toggle('active', mode === 'list'));
    grids.forEach((id) => document.getElementById(id)?.classList.toggle('active', mode === 'grid'));
    const booksMain = document.querySelector('.books-main') as HTMLElement | null;
    const categoryGridView = document.getElementById('category-grid-view');
    const sidebar = document.getElementById('books-sidebar');
    const booksLayout = document.getElementById('books-layout');

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
                <h2 class="category-expanded-title">${escapeHtml(displayName)}</h2>
                <button class="category-expanded-close" data-action="close-category-modal">&times;</button>
            </div>
            <div class="category-expanded-books">
                ${books.map((book: AnyObj) => {
                    const coverUrl = getCoverUrl(book);
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
    const book = state.books.find((entry: AnyObj) => entry.isbn === isbn);
    if (!book) return;
    closeCategoryModal();
    openBookModal(book);
}

// --- runtime ---
let booksRuntime: AnyObj = null;

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

function getCoverUrl(bookOrIsbn: AnyObj, size: 'medium' | 'large' = 'large'): string | null {
    if (!bookOrIsbn) return null;
    if (typeof bookOrIsbn === 'object') {
        if (size === 'medium' && bookOrIsbn.coverImageMedium) return bookOrIsbn.coverImageMedium;
        if (bookOrIsbn.coverImage) return bookOrIsbn.coverImage;
        return bookCoverUrl(bookOrIsbn, size) || null;
    }
    const cleanIsbn = String(bookOrIsbn).replace(/[^0-9X]/gi, '');
    return cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size === 'medium' ? 'M' : 'L'}.jpg` : null;
}

function flashCategoryArrow(button: HTMLElement | null, isExpanding: boolean) {
    if (!button) return;
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) existingArrow.remove();
    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);
    window.setTimeout(() => arrow.remove(), 500);
}

function renderFromState() { booksRuntime?.render(); }

function buildCollectionController() {
    booksRuntime = createCollectionRuntime({
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
        storageKey: 'books-sidebar-collapsed',
        layoutId: 'books-layout',
        sidebarId: 'books-sidebar',
        defaultCollapsed: true
    });
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

function initBooksZoom() {
    const booksGrid = document.getElementById('books-container');
    if (!booksGrid) return;
    booksGrid.classList.add('js-zoom-grid');
    booksGrid.querySelectorAll('.book-card').forEach((el) => el.classList.add('js-zoom-item'));
    // Cross-doc view-transitions exist (see @view-transition in
    // legacy-style.css) but in practice they don't always fire visibly
    // across cross-origin caches / Astro's MPA flow, so the cover read
    // as a "flash to position" instead of moving. To make the motion
    // deterministic we run a FLIP animation ourselves: clone the cover,
    // fly it from grid → detail hero, then navigate.
    initBookCoverFlight(booksGrid as HTMLElement);
}

function initBookCoverFlight(grid: HTMLElement) {
    grid.addEventListener('click', (event) => {
        if (event.defaultPrevented) return;
        const targetEl = event.target as Element | null;
        if (!targetEl) return;
        const card = targetEl.closest('a.book-card') as HTMLAnchorElement | null;
        if (!card) return;
        const href = card.getAttribute('href');
        if (!href || href === '#') return;
        const cover = card.querySelector('.book-cover') as HTMLImageElement | null;
        if (!cover) return;
        event.preventDefault();
        event.stopPropagation();
        flyCoverToDetail(cover, href);
    });
}

function flyCoverToDetail(cover: HTMLImageElement, href: string) {
    const sourceRect = cover.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height) {
        window.location.href = href;
        return;
    }

    // The grid card uses `object-fit: contain`, so the actual rendered
    // image inside the cover element is letterboxed if the natural
    // aspect doesn't match the box aspect. Compute the IMAGE's true
    // rendered rect (not the box rect) so the flight clone reads as
    // exactly the image the user saw — no aspect-ratio mismatch at the
    // start or end of the animation.
    const naturalW = cover.naturalWidth || sourceRect.width;
    const naturalH = cover.naturalHeight || sourceRect.height;
    const naturalAspect = naturalW / naturalH;
    const boxAspect = sourceRect.width / sourceRect.height;
    let srcRenderW: number, srcRenderH: number, srcRenderLeft: number, srcRenderTop: number;
    if (naturalAspect > boxAspect) {
        // Image wider than box → fits width, letterbox top/bottom.
        srcRenderW = sourceRect.width;
        srcRenderH = srcRenderW / naturalAspect;
        srcRenderLeft = sourceRect.left;
        srcRenderTop = sourceRect.top + (sourceRect.height - srcRenderH) / 2;
    } else {
        // Image taller than box → fits height, letterbox sides.
        srcRenderH = sourceRect.height;
        srcRenderW = srcRenderH * naturalAspect;
        srcRenderTop = sourceRect.top;
        srcRenderLeft = sourceRect.left + (sourceRect.width - srcRenderW) / 2;
    }

    // Detail-hero cover on the books detail page is the showcase target.
    // CSS uses `vw` units which include the scrollbar, so width computes
    // off window.innerWidth. Positioning, though, is relative to the
    // visible content area (excludes scrollbar).
    // The hero renders at natural aspect (height auto), so destHeight is
    // computed from naturalAspect — guarantees the clone end frame has
    // the same aspect/size as the hero.
    const cssVw = window.innerWidth;
    const contentVw = document.documentElement.clientWidth;
    const destWidth = cssVw <= 640
        ? Math.min(cssVw * 0.78, 320)
        : Math.min(cssVw * 0.72, 340);
    const destHeight = destWidth / naturalAspect;
    const destLeft = (contentVw - destWidth) / 2;
    // Empirically measured against the rendered detail-hero on the same
    // viewport. The detail page renders the "Back to Books" link + hero
    // margin under the navbar at this y.
    const destTop = cssVw <= 640 ? 123 : 165;

    const clone = cover.cloneNode() as HTMLImageElement;
    clone.removeAttribute('id');
    clone.removeAttribute('loading');
    // Strip the view-transition-name so the browser won't try to also
    // morph it during the navigation that follows.
    clone.style.viewTransitionName = 'none';
    clone.style.position = 'fixed';
    clone.style.left = srcRenderLeft + 'px';
    clone.style.top = srcRenderTop + 'px';
    clone.style.width = srcRenderW + 'px';
    clone.style.height = srcRenderH + 'px';
    // Override object-fit on the clone so the image fills the box
    // exactly — no letterbox inside the clone itself, since we sized
    // the clone box to match the image's rendered aspect.
    clone.style.objectFit = 'fill';
    clone.style.margin = '0';
    clone.style.zIndex = '99999';
    clone.style.transformOrigin = '0 0';
    clone.style.pointerEvents = 'none';
    clone.style.borderRadius = getComputedStyle(cover).borderRadius;
    clone.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.35)';
    // No background — the clone's aspect now matches the natural image
    // so there's nothing to letterbox.
    clone.style.background = 'transparent';

    // Hide the original so we don't render it twice during the flight.
    cover.style.visibility = 'hidden';
    // Also strip view-transition-name from the original so the cross-doc
    // view-transition doesn't try to morph the hidden element during nav.
    (cover.style as CSSStyleDeclaration).viewTransitionName = 'none';

    document.body.appendChild(clone);
    document.body.classList.add('is-book-launching');

    const scale = destWidth / srcRenderW;
    const tx = destLeft - srcRenderLeft;
    const ty = destTop - srcRenderTop;

    const animation = clone.animate(
        [
            {
                transform: 'translate(0px, 0px) scale(1)',
                boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)'
            },
            {
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                boxShadow: '0 28px 60px rgba(0, 0, 0, 0.55)'
            }
        ],
        {
            duration: 320,
            easing: 'cubic-bezier(.22, 1, .36, 1)',
            fill: 'forwards'
        }
    );

    const hardNav = () => {
        // Hand off to the detail page: it will fade its content in
        // around the already-visible hero cover.
        try { sessionStorage.setItem('book-flight-arrival', '1'); } catch (err) { /* ignore */ }
        window.location.href = href;
    };

    // SPA-style transition: fetch the detail page in parallel with the
    // flight, swap in its <main> as soon as it arrives, and start its
    // content fade-in WHILE the clone is still flying. The clone is the
    // visible "cover" through the whole motion; when it lands at the
    // hero position the hero takes over (also at opacity 1). This gives
    // a single continuous animation where the cover is moving AND the
    // surrounding page content is appearing in parallel.
    let spaTookOver = false;
    fetch(href, { credentials: 'same-origin' })
        .then((res) => res.ok ? res.text() : Promise.reject(new Error(String(res.status))))
        .then((html) => {
            if (spaTookOver) return;
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newMain = doc.querySelector('main.detail-page--book') as HTMLElement | null;
            const oldMain = document.querySelector('main') as HTMLElement | null;
            if (!newMain || !oldMain || !oldMain.parentNode) {
                hardNav();
                return;
            }
            spaTookOver = true;
            // Carry the detail page's <head> inline styles into the
            // current page so the SPA-injected main has access to
            // every style rule the standalone /books/{slug} page does
            // (showcase hero, etc.). Idempotent — drop any previous
            // SPA-injected blocks before adding the fresh ones so repeat
            // clicks don't pile up duplicates.
            document.querySelectorAll<HTMLStyleElement>('style[data-spa-detail-css="1"]')
                .forEach((existing) => existing.remove());
            doc.querySelectorAll('head style').forEach((style) => {
                const tagged = style.cloneNode(true) as HTMLStyleElement;
                tagged.setAttribute('data-spa-detail-css', '1');
                document.head.appendChild(tagged);
            });
            newMain.classList.add('is-spa-arrival');
            // Belt-and-suspenders: hide the new hero img via inline
            // style too. Class-based opacity rules can flash for one
            // paint frame during JS-driven insertion in some browsers;
            // inline style applies immediately on parse.
            const newHeroImg = newMain.querySelector('.detail-hero-cover img') as HTMLImageElement | null;
            if (newHeroImg) {
                newHeroImg.style.opacity = '0';
                // Stop the image from briefly rendering at its natural
                // raw size before CSS sizes it.
                newHeroImg.style.visibility = 'hidden';
            }
            oldMain.parentNode.replaceChild(newMain, oldMain);
            // The detail page doesn't render a sidebar — hide the
            // listing sidebar so the new main can center under its
            // already-faded backdrop.
            document.querySelectorAll<HTMLElement>('.books-sidebar')
                .forEach((el) => { el.style.display = 'none'; });
            document.title = doc.title;
            // Reset scroll so the new detail-hero ends up at viewport
            // top (matching the clone's flight destination). The clone
            // is position:fixed and stays put across the scroll, and the
            // new main's content is still at opacity 0 (is-spa-arrival),
            // so the scroll is visually invisible.
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            try { history.pushState({ bookFlight: true }, '', href); } catch (err) { /* ignore */ }
            // Force a frame, then add the reveal class so the new main's
            // content transitions from 0 → 1 in parallel with the flight.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newMain.classList.add('is-spa-revealed');
                });
            });
            // When the clone finishes flying, hand the cover over to the
            // hero img and remove the clone. Both sit at the same
            // pixel-exact position so the swap is invisible.
            const handoff = () => {
                // Reveal the real hero (clear the inline hides we set
                // at injection time) and remove the clone in the same
                // tick — both occupy identical pixel-exact rects so the
                // swap is invisible.
                if (newHeroImg) {
                    newHeroImg.style.visibility = '';
                    newHeroImg.style.opacity = '';
                }
                newMain.classList.add('is-spa-cover-revealed');
                clone.remove();
                cover.style.visibility = '';
                (cover.style as CSSStyleDeclaration).viewTransitionName = '';
                document.body.classList.remove('is-book-launching');
                // Restore sidebar style after cleanup in case the user
                // hits Back — we'll re-render on popstate.
                setTimeout(() => {
                    newMain.classList.remove('is-spa-arrival', 'is-spa-revealed', 'is-spa-cover-revealed');
                }, 240);
            };
            animation.finished
                .then(handoff)
                .catch(handoff);
        })
        .catch(() => {
            // Fallback: hard navigation if anything went wrong. Wait for
            // the flight to finish first so the user still sees the motion.
            animation.finished.then(hardNav).catch(hardNav);
            setTimeout(hardNav, 380);
        });

    // If for any reason the SPA path didn't kick in by the time the
    // flight is well past done, fall through to hard nav so the user
    // isn't stranded on a half-faded books page.
    setTimeout(() => { if (!spaTookOver) hardNav(); }, 900);
}

// Back/forward inside an SPA-swapped book detail page — fall back to a
// full reload so the listing page reinitializes cleanly.
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', (event) => {
        const state = (event.state || {}) as Record<string, unknown>;
        if (state.bookFlight) window.location.reload();
        // If location is now /books and we have an SPA-injected detail
        // main, the user is going "back" from the SPA swap — reload.
        if (location.pathname.endsWith('/books') || location.pathname.endsWith('/books.html')) {
            const onDetailMain = document.querySelector('main.detail-page--book');
            if (onDetailMain) window.location.reload();
        }
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
