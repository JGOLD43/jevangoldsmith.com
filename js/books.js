// Book Library Data
// Source of truth: data/books.json
let booksData = [];

async function loadBooksData() {
    if (booksData.length > 0) return booksData;

    booksData = await fetchJsonWithFallback(['data/books.generated.json', 'data/books.json']);
    return booksData;
}

async function fetchJsonWithFallback(urls) {
    let lastError = null;
    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                lastError = new Error(`Failed to load ${url}: ${response.status}`);
                continue;
            }
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('Failed to load books data');
}

// Prefer first-party generated covers; fall back to Open Library during local data edits.
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

function bookCoverFallback() {
    return "this.hidden=true;this.parentElement.classList.add('book-cover-missing');";
}

function allCategoryButton() {
    return document.querySelector('.sidebar-category[data-category="all"]');
}

// Render books to the page
function renderBooks(books = booksData) {
    const container = document.getElementById('books-container');
    if (!container) return;

    container.innerHTML = '';

    books.forEach((book) => {
        const bookCard = createBookCard(book);
        container.appendChild(bookCard);
    });
}

// Global filter state
let currentStarFilter = 'all';
let currentReReadsFilter = 'all';
let currentSearchQuery = '';

// Category mapping (display name to key)
const categoryMap = {
    'Advertising and Copywriting': 'advertising',
    'Autobiographies': 'autobiographies',
    'Big Ideas': 'bigideas',
    'The Great Books': 'greatbooks',
    'Out of the Box Thinking': 'outofthebox',
    'Patience and Clear Thinking': 'patience',
    'Learning': 'learning',
    'Persuasion': 'persuasion',
    'Psychology Books': 'psychology',
    'Science': 'science',
    'Storytelling': 'storytelling',
    'Strategy and War': 'strategy',
    'Who Am I?': 'whoami'
};

// Category icon mapping
const categoryIcons = {
    'Advertising and Copywriting': '📢',
    'Autobiographies': '👤',
    'Big Ideas': '💡',
    'The Great Books': '📖',
    'Out of the Box Thinking': '🎨',
    'Patience and Clear Thinking': '🧘',
    'Learning': '🎓',
    'Persuasion': '🎯',
    'Psychology Books': '🧠',
    'Science': '🔬',
    'Storytelling': '📚',
    'Strategy and War': '⚔️',
    'Who Am I?': '🤔'
};

// Get filtered books based on current filters
function getFilteredBooks() {
    let filtered = booksData;

    // Apply search filter
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(book =>
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query) ||
            (book.category && book.category.toLowerCase().includes(query))
        );
    }

    // Apply star filter
    if (currentStarFilter !== 'all') {
        filtered = filtered.filter(book => book.rating >= currentStarFilter);
    }

    // Apply re-reads filter
    if (currentReReadsFilter !== 'all') {
        // Show books with specific re-read count or higher
        filtered = filtered.filter(book => book.reReads >= currentReReadsFilter);
    }

    return filtered;
}

// Populate sidebar with book counts and lists
function populateSidebar() {
    const filteredBooks = getFilteredBooks();

    // Group books by category
    const categories = {};
    Object.keys(categoryMap).forEach(cat => {
        categories[categoryMap[cat]] = [];
    });

    filteredBooks.forEach(book => {
        const catKey = categoryMap[book.category];
        if (catKey && categories[catKey]) {
            categories[catKey].push(book);
        }
    });

    // Update counts
    document.getElementById('count-all').textContent = filteredBooks.length;
    Object.values(categoryMap).forEach(catKey => {
        const count = categories[catKey].length;
        const countEl = document.getElementById(`count-${catKey}`);
        if (countEl) {
            countEl.textContent = count;
            // Hide category if no books
            const section = countEl.closest('.sidebar-section');
            if (section) {
                section.style.display = count === 0 ? 'none' : 'block';
            }
        }
    });

    // Populate category lists
    Object.values(categoryMap).forEach(catKey => {
        const container = document.getElementById(`category-${catKey}`);
        if (!container || categories[catKey].length === 0) return;

        container.innerHTML = categories[catKey].map(book => `
            <a href="#" class="book-link" data-action="book-link" data-book-title="${escapeAttr(book.title)}">
                <div>${escapeHTML(book.title)}</div>
                <div class="book-link-author">${escapeHTML(book.author)}</div>
            </a>
        `).join('');
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card js-zoom-item';
    card.setAttribute('data-isbn', book.isbn);
    card.setAttribute('data-id', book.isbn || book.title);
    card.setAttribute('data-title', book.title);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.classList.add('has-review');
    card.style.cursor = 'pointer';

    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    const coverUrl = getCoverUrl(book);

    // Generate times read badge (top right corner)
    let timesReadBadge = '';
    const timesRead = (book.reReads || 0) + 1; // reReads + initial read
    if (timesRead > 1) {
        timesReadBadge = `<div class="times-read-badge">📖 ${timesRead}x Read</div>`;
    }

    const detailBody = book.review || book.shortDescription || `${book.title} by ${book.author}`;
    const detailLabel = book.review ? 'Review' : 'Notes';
    const detailHtml = `
        <div class="js-zoom-detail" aria-hidden="true">
            <p class="zoom-detail-kicker">${escapeHTML(book.author)}${book.year ? ' · ' + escapeHTML(book.year) : ''}</p>
            <p class="zoom-detail-title">${escapeHTML(book.title)}</p>
            <p class="zoom-detail-lead">${stars}</p>
            <p class="zoom-detail-line"><span>${detailLabel} —</span> ${escapeHTML(detailBody)}</p>
        </div>
    `;

    card.innerHTML = `
        ${timesReadBadge}
        <div class="book-cover-wrapper" data-title="${escapeAttr(book.title)}">
            <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" class="book-cover" loading="lazy" decoding="async" onerror="${bookCoverFallback()}">
            ${detailHtml}
        </div>
        <div class="book-info">
            <div class="book-title-row">
                <h3 class="book-title">${escapeHTML(book.title)}</h3>
                ${book.year ? `<span class="book-year">${escapeHTML(book.year)}</span>` : ''}
            </div>
            <p class="book-author">by ${escapeHTML(book.author)}</p>
            <div class="book-rating"><span class="rating-number">${book.rating}</span> ${stars}</div>
            ${book.review ? `<p class="book-description">${escapeHTML(book.shortDescription)}</p>` : ''}
        </div>
    `;

    return card;
}

// Open modal with full book review
function openBookModal(book) {
    if (!book.review) return;

    const modal = document.getElementById('book-modal');
    const modalTitle = document.getElementById('modal-book-title');
    const modalAuthor = document.getElementById('modal-book-author');
    const modalCover = document.getElementById('modal-book-cover');
    const modalRating = document.getElementById('modal-book-rating');
    const modalReview = document.getElementById('modal-book-review');

    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    const coverUrl = getCoverUrl(book);

    modalTitle.textContent = book.title;
    modalAuthor.textContent = `by ${book.author}${book.year ? ` (${book.year})` : ''}`;
    modalCover.src = coverUrl;
    modalCover.alt = book.title;
    modalCover.onerror = () => {
        modalCover.hidden = true;
    };
    modalCover.onload = () => {
        modalCover.hidden = false;
    };
    modalRating.textContent = stars;
    modalReview.textContent = book.review;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeBookModal() {
    const modal = document.getElementById('book-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('book-modal');
    if (event.target === modal) {
        closeBookModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeBookModal();
        closeCategoryModal();
    }
});

// Filter interaction state
let isDragging = false;
let isRereadsDragging = false;

// Search books by title, author, or category
function searchBooks(query) {
    currentSearchQuery = query.trim();

    // Show/hide clear button
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';
    }

    // Reset category to 'all' when searching
    activeCategory = 'all';

    // Re-populate sidebar and render books
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
}

// Clear search input and results
function clearSearch() {
    currentSearchQuery = '';
    const searchInput = document.getElementById('book-search');
    const clearBtn = document.getElementById('search-clear-btn');

    if (searchInput) {
        searchInput.value = '';
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    // Re-populate sidebar and render books
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
}

// Set star filter when clicking a star
function setStarFilter(rating) {
    currentStarFilter = rating;
    activeCategory = 'all';

    // Update star visual states
    updateStarFilterDisplay();

    // Update rating text display
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) {
        ratingText.textContent = `${rating}+`;
    }

    // Re-populate sidebar with filtered books
    populateSidebar();

    // Show all filtered books
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    allCategoryButton()?.classList.add('active');
}

// Clear star filter to show all books
function clearStarFilter() {
    currentStarFilter = 'all';
    activeCategory = 'all';

    // Update star visual states
    updateStarFilterDisplay();

    // Clear rating text display
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) {
        ratingText.textContent = '';
    }

    // Re-populate sidebar with all books
    populateSidebar();

    // Show all books
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    allCategoryButton()?.classList.add('active');
}

// Set re-reads filter
function setReReadsFilter(count) {
    currentReReadsFilter = count;
    activeCategory = 'all';

    // Update marker visual states
    updateReReadsFilterDisplay();

    // Update text display
    const timesreadText = document.getElementById('filter-timesread-text');
    if (timesreadText) {
        timesreadText.textContent = count >= 10 ? '10' : `${count}`;
    }

    // Re-populate sidebar with filtered books
    populateSidebar();

    // Show filtered books
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    allCategoryButton()?.classList.add('active');
}

// Clear re-reads filter (called by Show All link in star filter)
function clearReReadsFilter() {
    currentReReadsFilter = 'all';
    activeCategory = 'all';

    // Update marker visual states
    updateReReadsFilterDisplay();

    // Clear text display
    const timesreadText = document.getElementById('filter-timesread-text');
    if (timesreadText) {
        timesreadText.textContent = '';
    }

    // Re-populate sidebar with all books
    populateSidebar();

    // Show all books
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    allCategoryButton()?.classList.add('active');
}

// Update times read filter slider visual state
function updateReReadsFilterDisplay() {
    const slider = document.getElementById('timesread-slider');
    if (slider) {
        slider.value = currentReReadsFilter === 'all' ? 0 : currentReReadsFilter;
    }
}

// Update the visual state of star filter
function updateStarFilterDisplay() {
    const stars = document.querySelectorAll('.filter-star');
    stars.forEach((star, index) => {
        const starNumber = parseInt(star.getAttribute('data-star'));
        star.classList.remove('full', 'half');

        if (currentStarFilter === 'all') {
            return;
        }

        // Check if this star should be filled
        if (starNumber <= Math.floor(currentStarFilter)) {
            star.classList.add('full');
        } else if (starNumber === Math.ceil(currentStarFilter) && currentStarFilter % 1 === 0.5) {
            star.classList.add('half');
        }
    });
}

// Initialize star filter interactions
function initStarFilter() {
    const container = document.getElementById('star-filter-container');
    if (!container) return;

    const stars = container.querySelectorAll('.filter-star');

    stars.forEach((star) => {
        // Click to set rating
        star.addEventListener('click', (e) => {
            const starNumber = parseInt(star.getAttribute('data-star'));
            const rect = star.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isLeftHalf = clickX < rect.width / 2;

            const rating = isLeftHalf ? starNumber - 0.5 : starNumber;
            setStarFilter(rating);
        });

        // Drag functionality
        star.addEventListener('mousedown', (e) => {
            isDragging = true;
            const starNumber = parseInt(star.getAttribute('data-star'));
            const rect = star.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isLeftHalf = clickX < rect.width / 2;

            const rating = isLeftHalf ? starNumber - 0.5 : starNumber;
            setStarFilter(rating);
        });

        star.addEventListener('mouseenter', (e) => {
            if (isDragging) {
                const starNumber = parseInt(star.getAttribute('data-star'));
                const rect = star.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const isLeftHalf = clickX < rect.width / 2;

                const rating = isLeftHalf ? starNumber - 0.5 : starNumber;
                setStarFilter(rating);
            }
        });
    });

    // Mouse up anywhere - end drag
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Initialize times read filter slider
function initReReadsFilter() {
    const slider = document.getElementById('timesread-slider');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        if (count === 0) {
            clearReReadsFilter();
        } else {
            setReReadsFilter(count);
        }
    });
}

// Show arrow flash animation
function showArrowFlash(button, isExpanding) {
    // Remove any existing arrow flash
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) existingArrow.remove();

    // Create arrow element
    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);

    // Remove after animation completes
    setTimeout(() => arrow.remove(), 500);
}

// Toggle book category expansion
function toggleBookCategory(category, sourceButton = null) {
    const filteredBooks = getFilteredBooks();
    activeCategory = category;

    if (category === 'all') {
        // Show all filtered books
        renderBooks(filteredBooks);
        // Update counter for all books
        updateBookCount(filteredBooks.length, 'all');
        // Remove active from all categories
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('active', 'expanded');
        });
        document.querySelectorAll('.category-books').forEach(div => {
            div.classList.remove('expanded');
        });
        // Activate "All Books"
        if (sourceButton) sourceButton.classList.add('active');
        return;
    }

    const button = sourceButton;
    if (!button) return;
    const container = document.getElementById(`category-${category}`);

    if (!container) return;

    // Find the full category name from the key
    const fullCategoryName = Object.keys(categoryMap).find(k => categoryMap[k] === category);

    // Filter books by category (and current filters)
    const categoryBooks = filteredBooks.filter(book => book.category === fullCategoryName);

    // Toggle expansion
    const isExpanded = container.classList.contains('expanded');

    // Show arrow flash animation
    showArrowFlash(button, !isExpanded);

    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
        // When collapsing, show all books and update counter
        activeCategory = 'all';
        renderBooks(filteredBooks);
        updateBookCount(filteredBooks.length, 'all');
    } else {
        // Collapse all others
        document.querySelectorAll('.category-books').forEach(div => {
            div.classList.remove('expanded');
        });
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('expanded');
        });

        // Expand this one
        container.classList.add('expanded');
        button.classList.add('expanded');

        // Render and update counter for this category
        renderBooks(categoryBooks);
        updateBookCount(categoryBooks.length, category);
    }

    // Update active state
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
}

// Scroll to specific book
function scrollToBookByTitle(bookTitle, event) {
    if (event) event.preventDefault();

    // Find the book card by title
    const bookCards = document.querySelectorAll('.book-card');
    let targetCard = null;

    bookCards.forEach(card => {
        const titleElement = card.querySelector('.book-title');
        if (titleElement && titleElement.textContent === bookTitle) {
            targetCard = card;
        }
    });

    if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the book briefly
        targetCard.style.transform = 'scale(1.05)';
        targetCard.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.3)';
        setTimeout(() => {
            targetCard.style.transform = '';
            targetCard.style.boxShadow = '';
        }, 2000);

        // Update active link
        document.querySelectorAll('.book-link').forEach(link => {
            link.classList.remove('active');
        });
        event?.target?.closest('.book-link')?.classList.add('active');
    }
}

// Track active category
let activeCategory = 'all';

// Update the book counter with dynamic label
function updateBookCount(count = null, categoryName = null) {
    const countElement = document.getElementById('book-count');
    const labelElement = document.getElementById('counter-label');

    if (countElement) {
        if (count !== null) {
            countElement.textContent = count;
        } else {
            countElement.textContent = booksData.length;
        }
    }

    if (labelElement) {
        if (categoryName && categoryName !== 'all') {
            labelElement.textContent = 'Books Read';
        } else {
            labelElement.textContent = 'Total Books Read';
        }
    }
}

// Clear all filters
function clearAllFilters() {
    currentStarFilter = 'all';
    currentReReadsFilter = 'all';
    currentSearchQuery = '';
    activeCategory = 'all';

    // Clear search input
    const searchInput = document.getElementById('book-search');
    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';

    // Update star visual states
    updateStarFilterDisplay();
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) ratingText.textContent = '';

    // Clear times read filter
    const slider = document.getElementById('timesread-slider');
    if (slider) slider.value = 0;
    const timesreadText = document.getElementById('filter-timesread-text');
    if (timesreadText) timesreadText.textContent = '';

    // Re-populate sidebar
    populateSidebar();

    // Clear category selection
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
    document.querySelectorAll('.category-books').forEach(section => section.classList.remove('expanded'));
    allCategoryButton()?.classList.add('active');

    // Show all books and update counter
    renderBooks();
    updateBookCount(booksData.length, 'all');
}

// Toggle sidebar collapse
function toggleSidebar() {
    const layout = document.getElementById('books-layout');
    const sidebar = document.getElementById('books-sidebar');
    layout.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed');

    // Save state to localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('books-sidebar-collapsed', isCollapsed);
}

// Toggle list dropdown
function toggleListDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('list-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

// Scroll to a book in the grid
function scrollToBookByIsbn(isbn) {
    const bookCard = document.querySelector(`[data-isbn="${isbn}"]`);
    if (bookCard) {
        bookCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        bookCard.style.transform = 'scale(1.05)';
        bookCard.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
        setTimeout(() => {
            bookCard.style.transform = '';
            bookCard.style.boxShadow = '';
        }, 1000);
    }
}

// Populate the recent books carousel
function initCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track) return;

    // Get recent books (first 6 from array, duplicated for seamless loop)
    const recentBooks = booksData.slice(0, 6);
    const allBooks = [...recentBooks, ...recentBooks]; // Duplicate for seamless scrolling

    track.innerHTML = allBooks.map(book => {
        const coverUrl = getCoverUrl(book, 'medium');
        return `<img class="carousel-book" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" data-action="carousel-book" data-isbn="${escapeAttr(book.isbn)}" onerror="this.remove()">`;
    }).join('');
}

function bindBooksUiEvents() {
    document.addEventListener('click', (event) => {
        const modalClose = event.target.closest('[data-action="close-book-modal"]');
        if (modalClose) {
            closeBookModal();
            return;
        }

        const sidebarCollapse = event.target.closest('[data-action="toggle-sidebar"]');
        if (sidebarCollapse) {
            toggleSidebar();
            return;
        }

        const listDropdown = event.target.closest('[data-action="toggle-list-dropdown"]');
        if (listDropdown) {
            toggleListDropdown();
            return;
        }

        const searchClear = event.target.closest('[data-action="clear-search"]');
        if (searchClear) {
            clearSearch();
            return;
        }

        const clearStars = event.target.closest('[data-action="clear-star-filter"]');
        if (clearStars) {
            event.preventDefault();
            clearStarFilter();
            return;
        }

        const categoryButton = event.target.closest('.sidebar-category[data-category]');
        if (categoryButton) {
            toggleBookCategory(categoryButton.dataset.category || 'all', categoryButton);
            return;
        }

        const viewToggle = event.target.closest('[data-action="set-view-mode"]');
        if (viewToggle) {
            setViewMode(viewToggle.dataset.mode || 'list');
            return;
        }

        const bookLink = event.target.closest('[data-action="book-link"]');
        if (bookLink) {
            scrollToBookByTitle(bookLink.dataset.bookTitle || '', event);
            return;
        }

        const carouselBook = event.target.closest('[data-action="carousel-book"]');
        if (carouselBook) {
            scrollToBookByIsbn(carouselBook.dataset.isbn || '');
            return;
        }

        const categoryModal = event.target.closest('[data-action="open-category-modal"]');
        if (categoryModal) {
            openCategoryModal(categoryModal.dataset.category || '');
            return;
        }

        const closeCategory = event.target.closest('[data-action="close-category-modal"]');
        if (closeCategory) {
            closeCategoryModal();
            return;
        }

        const openBookFromCategory = event.target.closest('[data-action="open-book-from-grid"]');
        if (openBookFromCategory) {
            openBookFromGrid(openBookFromCategory.dataset.isbn || '');
        }
    });

    const searchInput = document.getElementById('book-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => searchBooks(searchInput.value));
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        bindBooksUiEvents();
        await loadBooksData();
        renderBooks();
        populateSidebar();
        initStarFilter();
        initReReadsFilter();
        initCarousel();
        updateBookCount(booksData.length, 'all');
        const booksGrid = document.getElementById('books-container');
        if (booksGrid && window.JGGridZoom) {
            booksGrid.classList.add('js-zoom-grid');
            window.JGGridZoom.init({
                grid: booksGrid,
                itemSelector: '.book-card',
                triggerSelector: '.book-card',
                anchorSelector: '.book-cover',
                fillW: 0.56,
                fillH: 0.48,
                maxScale: 3.4,
                eventName: 'book_open'
            });
        }
    } catch (error) {
        console.error(error);
        const container = document.getElementById('books-container');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">Books are unavailable right now.</p>';
        }
    }
});

// View mode state
let currentViewMode = 'list';

// Category display names mapping
const categoryDisplayNames = {
    'Advertising and Copywriting': 'Advertising',
    'Astral Projection': 'Astral projection',
    'Autobiographies': 'Autobiographies',
    'Big Ideas': 'Big Ideas',
    'Copywriting': 'Copywriting',
    'The Great Books': 'The Great Books',
    'Lee Kuan Yew': 'Lee Kuan Yew',
    'Learning': 'Learning',
    'Out of the Box Thinking': 'Out Of The Box Thinking',
    'Patience and Clear Thinking': 'Mental Endurance...',
    'Persuasion': 'Persuasion',
    'Psychology Books': 'Psychology',
    'Science': 'Science',
    'Storytelling': 'Storytelling',
    'Strategy and War': 'Strategy',
    'Who Am I?': 'Who Am I?'
};

// Set view mode (list or grid)
function setViewMode(mode) {
    currentViewMode = mode;

    // Get all view toggle buttons
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

    // Update button states (all toggle buttons)
    if (listBtn) listBtn.classList.toggle('active', mode === 'list');
    if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
    if (listBtnGrid) listBtnGrid.classList.toggle('active', mode === 'list');
    if (gridBtnGrid) gridBtnGrid.classList.toggle('active', mode === 'grid');
    if (listBtnMain) listBtnMain.classList.toggle('active', mode === 'list');
    if (gridBtnMain) gridBtnMain.classList.toggle('active', mode === 'grid');

    if (mode === 'grid') {
        // Hide list view, show grid view
        booksMain.style.display = 'none';
        categoryGridView.style.display = 'block';
        sidebar.style.display = 'none';
        booksLayout.classList.add('grid-view-active');
        booksLayout.classList.remove('sidebar-collapsed');
        renderCategoryGrid();
    } else {
        // Show list view, hide grid view
        booksMain.style.display = 'block';
        categoryGridView.style.display = 'none';
        sidebar.style.display = 'block';
        booksLayout.classList.remove('grid-view-active');
        if (sidebar.classList.contains('collapsed')) {
            booksLayout.classList.add('sidebar-collapsed');
        }
    }
}

// Get books grouped by category
function getBooksByCategory() {
    const categories = {};
    booksData.forEach(book => {
        const cat = book.category || 'Uncategorized';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(book);
    });
    return categories;
}

// Render category grid
function renderCategoryGrid() {
    const container = document.getElementById('category-grid');
    const booksByCategory = getBooksByCategory();

    // Sort categories by book count
    const sortedCategories = Object.entries(booksByCategory)
        .sort((a, b) => b[1].length - a[1].length);

    container.innerHTML = sortedCategories.map(([category, books]) => {
        // Get up to 8 book covers for the preview
        const previewBooks = books.slice(0, 8);
        const displayName = categoryDisplayNames[category] || category;

        const bookCovers = previewBooks.map(book => {
            const coverUrl = getCoverUrl(book, 'medium');
            return `<img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" loading="lazy" decoding="async" onerror="this.remove()">`;
        }).join('');

        // Fill empty slots if less than 8 books
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

// Open category modal
function openCategoryModal(category) {
    const booksByCategory = getBooksByCategory();
    const books = booksByCategory[category] || [];
    const displayName = categoryDisplayNames[category] || category;

    // Create or get modal
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
                ${books.map(book => {
                    const coverUrl = getCoverUrl(book);
                    return `
                        <div class="category-expanded-book" data-action="open-book-from-grid" data-isbn="${escapeAttr(book.isbn)}">
                            <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" onerror="this.remove()">
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close category modal
function closeCategoryModal() {
    const modal = document.getElementById('category-expanded-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Open book modal from grid view
function openBookFromGrid(isbn) {
    const book = booksData.find(b => b.isbn === isbn);
    if (book) {
        closeCategoryModal();
        openBookModal(book);
    }
}
