import { CATEGORY_NAME_BY_KEY } from '../lib/book-categories';
import { applyCardVisibility } from './collection-helpers';
import { highlightAndScroll } from './collection-ui';
import { escapeAttr, escapeHtml } from '../lib/html-escape';
import { slugify } from '../lib/slug';
import { categoryDisplayNames, getCoverUrl, state } from './books-state';
import { TIMING } from './timing';

export function renderBooks(books: AnyObj[]) {
    const container = document.getElementById('books-container');
    const visible = new Set<string>(books.map((b) => b.isbn || b.title));
    applyCardVisibility(
        container,
        visible,
        ':scope > *',
        (card) => [card.dataset.isbn || '', card.dataset.title || '']
    );
}

export function renderSidebar(categories: Record<string, AnyObj[]>) {
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

export function renderCarousel(books: AnyObj[]) {
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

export function scrollToBookByTitle(bookTitle: string, event?: Event) {
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

export function updateBookCount(count: number, categoryName?: string) {
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

export function updateReReadsFilterDisplay(value: string | number) {
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

export function updateStarFilterDisplay(value: string | number) {
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

export function getBooksByCategory(): Record<string, AnyObj[]> {
    const categories: Record<string, AnyObj[]> = {};
    state.books.forEach((book: AnyObj) => {
        const category = book.category || 'Uncategorized';
        if (!categories[category]) categories[category] = [];
        categories[category].push(book);
    });
    return categories;
}

export function renderCategoryGrid() {
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

export function setViewMode(mode: string) {
    state.viewMode = mode || 'list';
    const ids = ['list-view-btn', 'list-view-btn-grid', 'list-view-btn-main'];
    const grids = ['grid-view-btn', 'grid-view-btn-grid', 'grid-view-btn-main'];
    ids.forEach((id) => document.getElementById(id)?.classList.toggle('active', mode === 'list'));
    grids.forEach((id) => document.getElementById(id)?.classList.toggle('active', mode === 'grid'));
    // Keep the single-button view toggles in sync with current mode so
    // their visible icon + accessible label reflect the next-target view.
    const nextLabel = mode === 'list' ? 'Switch to grid view' : 'Switch to list view';
    document.querySelectorAll<HTMLButtonElement>('.view-toggle-single').forEach((btn) => {
        btn.dataset.currentMode = mode;
        btn.setAttribute('aria-label', nextLabel);
        btn.setAttribute('title', nextLabel);
    });
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

export function flashCategoryArrow(button: HTMLElement | null, isExpanding: boolean) {
    if (!button) return;
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) existingArrow.remove();
    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);
    window.setTimeout(() => arrow.remove(), TIMING.arrowFlash);
}
