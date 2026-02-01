// Book Library Data
// Add your books here - each book can have an optional review
// Covers will be fetched automatically from Open Library API using ISBN
const booksData = [
    {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "9780735211292",
        year: "2018",
        rating: 5,
        reReads: 2,
        category: "Learning",
        shortDescription: "A transformative guide to building good habits and breaking bad ones.",
        review: `James Clear's "Atomic Habits" is one of the most practical books on behavior change I've ever read.

The framework is brilliantly simple: tiny changes compound over time. Clear doesn't promise overnight transformation—instead, he shows how 1% improvements, when stacked consistently, lead to remarkable results.

What I loved most:
- The habit loop framework (cue, craving, response, reward) makes abstract concepts concrete
- Real-world examples from athletes, artists, and entrepreneurs
- The focus on systems over goals—a paradigm shift in how I approach personal development

Key takeaway: You don't rise to the level of your goals, you fall to the level of your systems. This idea alone changed how I structure my daily routines.

If you struggle with consistency or want to understand why you do what you do, read this book.`
    },
    {
        title: "The Lean Startup",
        author: "Eric Ries",
        isbn: "9780307887894",
        year: "2011",
        rating: 4,
        reReads: 0,
        category: "Strategy and War",
        shortDescription: "Essential reading for entrepreneurs on building successful startups.",
        review: `Eric Ries codified what many successful founders learned the hard way: build, measure, learn, repeat.

The core insight is simple but profound: most startups fail not because they can't build a product, but because they build something nobody wants. The solution? Validated learning through rapid experimentation.

The MVP (Minimum Viable Product) concept has been overused and misunderstood since this book, but Ries's original formulation is spot-on: build the smallest thing that lets you start learning.

My favorite chapters focus on pivot vs. persevere decisions. Knowing when to change course is an art, and Ries provides frameworks to make that call more scientific.

If I have one criticism, it's that the book can feel repetitive. The key concepts could have been compressed. But for anyone building a product, this is required reading.`
    },
    {
        title: "Thinking, Fast and Slow",
        author: "Daniel Kahneman",
        isbn: "9780374533557",
        year: "2011",
        rating: 5,
        reReads: 1,
        category: "Psychology Books",
        shortDescription: "A masterpiece on human cognition and decision-making.",
        review: `Kahneman's magnum opus is dense, challenging, and absolutely essential for understanding how humans think.

The dual-system framework—System 1 (fast, intuitive, emotional) and System 2 (slow, deliberate, logical)—explains so much about human behavior. We like to think we're rational, but System 1 is running the show most of the time.

What makes this book brilliant is the decades of rigorous research behind every claim. Kahneman doesn't just theorize; he shows you the experiments, the data, the replication studies.

Key insights that stuck with me:
- Anchoring effects are everywhere and impossible to avoid
- Loss aversion drives more decisions than we realize
- The experiencing self vs. the remembering self explains why we make choices that don't maximize happiness

Warning: This book will make you question every decision you've ever made. You'll start seeing cognitive biases in yourself and others constantly. It's both enlightening and slightly disturbing.

Required reading for anyone interested in psychology, economics, or making better decisions.`
    },
    {
        title: "Zero to One",
        author: "Peter Thiel",
        isbn: "9780804139298",
        year: "2014",
        rating: 5,
        reReads: 0,
        category: "Out of the Box Thinking",
        shortDescription: "Contrarian thinking about startups and creating the future.",
        review: null // No review yet
    },
    {
        title: "The Power of Now",
        author: "Eckhart Tolle",
        isbn: "9781577314806",
        year: "1997",
        rating: 4,
        reReads: 0,
        category: "Who Am I?",
        shortDescription: "A spiritual guide to living in the present moment.",
        review: null
    },
    {
        title: "Principles",
        author: "Ray Dalio",
        isbn: "9781501124020",
        year: "2017",
        rating: 5,
        reReads: 3,
        category: "Patience and Clear Thinking",
        shortDescription: "Life and work principles from one of the world's most successful investors.",
        review: null
    },
    {
        title: "Sapiens",
        author: "Yuval Noah Harari",
        isbn: "9780062316097",
        year: "2011",
        rating: 5,
        reReads: 0,
        category: "Big Ideas",
        shortDescription: "A sweeping history of humankind.",
        review: null
    },
    {
        title: "The Hard Thing About Hard Things",
        author: "Ben Horowitz",
        isbn: "9780062273208",
        year: "2014",
        rating: 4,
        reReads: 1,
        category: "Strategy and War",
        shortDescription: "Building a business when there are no easy answers.",
        review: null
    },
    {
        title: "Deep Work",
        author: "Cal Newport",
        isbn: "9781455586691",
        year: "2016",
        rating: 5,
        reReads: 0,
        category: "Learning",
        shortDescription: "Rules for focused success in a distracted world.",
        review: null
    },
    {
        title: "The Mom Test",
        author: "Rob Fitzpatrick",
        isbn: "9781492180746",
        year: "2013",
        rating: 5,
        reReads: 0,
        category: "Strategy and War",
        shortDescription: "How to talk to customers and learn if your business is a good idea.",
        review: null
    },
    {
        title: "Influence",
        author: "Robert Cialdini",
        isbn: "9780061241895",
        year: "1984",
        rating: 4,
        reReads: 0,
        category: "Persuasion",
        shortDescription: "The psychology of persuasion.",
        review: null
    },
    {
        title: "Shoe Dog",
        author: "Phil Knight",
        isbn: "9781501135910",
        year: "2016",
        rating: 5,
        reReads: 0,
        category: "Autobiographies",
        shortDescription: "A memoir by the creator of Nike.",
        review: null
    }
];

// Get cover URL from ISBN using Open Library Covers API
function getCoverUrl(isbn) {
    if (!isbn) return null;
    // Remove hyphens from ISBN
    const cleanIsbn = isbn.replace(/-/g, '');
    // Open Library Covers API - returns high quality covers
    return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
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
            <a href="#" class="book-link" onclick="scrollToBook('${book.title.replace(/'/g, "\\'")}', event)">
                <div>${book.title}</div>
                <div class="book-link-author">${book.author}</div>
            </a>
        `).join('');
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    if (book.review) {
        card.classList.add('has-review');
        card.style.cursor = 'pointer';
        card.onclick = () => openBookModal(book);
    }

    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    const coverUrl = getCoverUrl(book.isbn);

    // Generate times read badge (top corner like Amazon Best Seller)
    let timesReadBadge = '';
    const timesRead = (book.reReads || 0) + 1; // reReads + initial read
    if (timesRead > 1) {
        timesReadBadge = `<div class="times-read-badge">${timesRead}x Read</div>`;
    }

    card.innerHTML = `
        ${timesReadBadge}
        <div class="book-cover-wrapper">
            <img src="${coverUrl}" alt="${book.title}" class="book-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center'; this.style.color='white'; this.style.fontWeight='bold'; this.style.padding='2rem'; this.style.textAlign='center'; this.innerHTML='${book.title}';">
        </div>
        <div class="book-info">
            <div class="book-title-row">
                <h3 class="book-title">${book.title}</h3>
                ${book.year ? `<span class="book-year">${book.year}</span>` : ''}
            </div>
            <p class="book-author">by ${book.author}</p>
            <div class="book-rating">${stars}</div>
            ${book.review ? `<p class="book-description">${book.shortDescription}</p>` : ''}
            ${book.review ? '<button class="read-review-btn">Read My Review</button>' : ''}
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
    const coverUrl = getCoverUrl(book.isbn);

    modalTitle.textContent = book.title;
    modalAuthor.textContent = `by ${book.author}${book.year ? ` (${book.year})` : ''}`;
    modalCover.src = coverUrl;
    modalCover.alt = book.title;
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
    }
});

// Filter interaction state
let isDragging = false;
let isRereadsDragging = false;

// Set star filter when clicking a star
function setStarFilter(rating) {
    currentStarFilter = rating;

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
    renderBooks(getFilteredBooks());

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    document.querySelector('[onclick*="toggleBookCategory(\'all\')"]')?.classList.add('active');
}

// Clear star filter to show all books
function clearStarFilter() {
    currentStarFilter = 'all';

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
    renderBooks(getFilteredBooks());

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    document.querySelector('[onclick*="toggleBookCategory(\'all\')"]')?.classList.add('active');
}

// Set re-reads filter
function setReReadsFilter(count) {
    currentReReadsFilter = count;

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
    renderBooks(getFilteredBooks());

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    document.querySelector('[onclick*="toggleBookCategory(\'all\')"]')?.classList.add('active');
}

// Clear re-reads filter (called by Show All link in star filter)
function clearReReadsFilter() {
    currentReReadsFilter = 'all';

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
    renderBooks(getFilteredBooks());

    // Reset category active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.category-books').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Books"
    document.querySelector('[onclick*="toggleBookCategory(\'all\')"]')?.classList.add('active');
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

// Toggle book category expansion
function toggleBookCategory(category) {
    const filteredBooks = getFilteredBooks();

    if (category === 'all') {
        // Show all filtered books
        renderBooks(filteredBooks);
        // Remove active from all categories
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('active', 'expanded');
        });
        document.querySelectorAll('.category-books').forEach(div => {
            div.classList.remove('expanded');
        });
        // Activate "All Books"
        event.target.closest('.sidebar-category').classList.add('active');
        return;
    }

    const button = event.target.closest('.sidebar-category');
    const container = document.getElementById(`category-${category}`);

    if (!container) return;

    // Toggle expansion
    const isExpanded = container.classList.contains('expanded');

    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
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

        // Find the full category name from the key
        const fullCategoryName = Object.keys(categoryMap).find(k => categoryMap[k] === category);

        // Filter books by category (and current star filter)
        const categoryBooks = filteredBooks.filter(book => book.category === fullCategoryName);
        renderBooks(categoryBooks);
    }

    // Update active state
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
}

// Scroll to specific book
function scrollToBook(bookTitle, event) {
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
        event.target.closest('.book-link').classList.add('active');
    }
}

// Update the book counter
function updateBookCount() {
    const countElement = document.getElementById('book-count');
    if (countElement) {
        countElement.textContent = booksData.length;
    }
}

// Clear all filters
function clearAllFilters() {
    // Clear star filter
    clearStarFilter();
    // Clear times read filter
    const slider = document.getElementById('timesread-slider');
    if (slider) {
        slider.value = 0;
        filterByTimesRead(0);
    }
    // Clear category selection
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.category-books').forEach(section => section.classList.remove('expanded'));
    // Show all books
    renderBooks();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    renderBooks();
    populateSidebar();
    initStarFilter();
    initReReadsFilter();
    updateBookCount();
});