// Admin Dashboard JavaScript
// Handles navigation, modals, and content management

// ==================== NAVIGATION ====================

// Section titles for the page header
const sectionTitles = {
    dashboard: 'Dashboard',
    essays: 'Essays',
    adventures: 'Adventures',
    books: 'Books',
    movies: 'Movies',
    music: 'Music',
    podcasts: 'Podcasts',
    products: 'Products',
    people: 'People',
    food: 'Food',
    quotes: 'Quotes',
    projects: 'Projects',
    challenges: 'Challenges',
    skills: 'Skills',
    lessons: 'Lessons',
    photos: 'Photos'
};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initMobileMenu();
    initSidebarToggle();
    initLogout();
    initModalClose();

    // Load books from main site data
    loadBooksFromData();

    // Update stats
    updateStats();

    // Check for hash in URL and navigate to that section
    const hash = window.location.hash.slice(1);
    if (hash && sectionTitles[hash]) {
        navigateTo(hash);
    }
});

// ==================== BOOKS DATA INTEGRATION ====================

// Load books from the main site's booksData array
function loadBooksFromData() {
    // Check if booksData exists (loaded from ../js/books.js)
    if (typeof booksData === 'undefined') {
        console.warn('booksData not found - books.js may not be loaded');
        return;
    }

    // Populate category dropdown
    populateBookCategories();

    // Display books
    displayBooks(booksData);

    // Setup search
    const searchInput = document.getElementById('books-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            filterBooks();
        }, 300));
    }

    // Setup category filter
    const categoryFilter = document.getElementById('books-category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterBooks);
    }
}

// Get unique categories from books
function populateBookCategories() {
    const categoryFilter = document.getElementById('books-category-filter');
    if (!categoryFilter || typeof booksData === 'undefined') return;

    const categories = [...new Set(booksData.map(book => book.category))].sort();

    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
        categoryFilter.innerHTML += `<option value="${escapeAttr(category)}">${escapeHTML(category)}</option>`;
    });
}

// Display books in the list
function displayBooks(books) {
    const booksList = document.getElementById('books-list');
    if (!booksList) return;

    if (books.length === 0) {
        booksList.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <p>No books found</p>
            </div>
        `;
        return;
    }

    booksList.innerHTML = books.map(book => `
        <div class="item-card" data-isbn="${escapeAttr(book.isbn)}">
            <div class="item-info">
                <h3>${escapeHTML(book.title)}</h3>
                <div class="item-meta">
                    <span>${escapeHTML(book.author)}</span>
                    <span>${escapeHTML(book.category)}</span>
                    <span class="star-rating">${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</span>
                    ${book.reReads > 0 ? `<span>Re-reads: ${book.reReads}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-edit" onclick="editBook('${escapeAttr(book.isbn)}')">Edit</button>
            </div>
        </div>
    `).join('');
}

// Filter books by search and category
function filterBooks() {
    if (typeof booksData === 'undefined') return;

    const searchTerm = document.getElementById('books-search')?.value?.toLowerCase() || '';
    const category = document.getElementById('books-category-filter')?.value || 'all';

    let filtered = booksData;

    if (searchTerm) {
        filtered = filtered.filter(book =>
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm)
        );
    }

    if (category !== 'all') {
        filtered = filtered.filter(book => book.category === category);
    }

    displayBooks(filtered);
}

// Edit book (show info - actual editing would require backend)
function editBook(isbn) {
    const book = booksData.find(b => b.isbn === isbn);
    if (!book) return;

    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !modalBody) return;

    if (modalTitle) modalTitle.textContent = 'Edit Book';

    modalBody.innerHTML = `
        <form id="edit-book-form">
            <div class="form-group">
                <label>Title</label>
                <input type="text" value="${escapeAttr(book.title)}" readonly style="background: var(--admin-background);">
            </div>
            <div class="form-group">
                <label>Author</label>
                <input type="text" value="${escapeAttr(book.author)}" readonly style="background: var(--admin-background);">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Category</label>
                    <input type="text" value="${escapeAttr(book.category)}" readonly style="background: var(--admin-background);">
                </div>
                <div class="form-group">
                    <label>Rating</label>
                    <input type="text" value="${'★'.repeat(book.rating)}" readonly style="background: var(--admin-background);">
                </div>
            </div>
            <div class="form-group">
                <label>ISBN</label>
                <input type="text" value="${escapeAttr(book.isbn)}" readonly style="background: var(--admin-background);">
            </div>
            ${book.shortDescription ? `
            <div class="form-group">
                <label>Description</label>
                <textarea readonly style="background: var(--admin-background); min-height: 80px;">${escapeHTML(book.shortDescription)}</textarea>
            </div>
            ` : ''}
            <div class="form-hint" style="margin-top: 1rem; padding: 1rem; background: rgba(201, 168, 108, 0.1); border-radius: 8px;">
                <strong>Note:</strong> Book data is stored in <code>js/books.js</code>. To edit books, modify that file directly and redeploy your site.
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </form>
    `;

    modal.classList.add('show');
}

// Initialize navigation click handlers
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            navigateTo(section);

            // Close mobile menu if open
            closeMobileMenu();
        });
    });
}

// Navigate to a specific section
function navigateTo(sectionName) {
    // Update URL hash
    window.location.hash = sectionName;

    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update nav items
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && sectionTitles[sectionName]) {
        pageTitle.textContent = sectionTitles[sectionName];
    }
}

// ==================== MOBILE MENU ====================

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('admin-sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');

            // Create overlay if it doesn't exist
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);

                overlay.addEventListener('click', closeMobileMenu);
            }

            overlay.classList.toggle('show');
        });
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.remove('mobile-open');
    }

    if (overlay) {
        overlay.classList.remove('show');
    }
}

// ==================== SIDEBAR TOGGLE ====================

function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');

            // Save preference
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        // Restore preference
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }
    }
}

// ==================== LOGOUT ====================

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to log out?')) {
                logout();
            }
        });
    }
}

// ==================== MODAL HANDLING ====================

function showAddForm(contentType) {
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !modalBody) return;

    // Set title
    if (modalTitle) {
        const titles = {
            books: 'Add Book',
            essays: 'New Essay',
            movies: 'Add Movie',
            music: 'Add Music',
            podcasts: 'Add Podcast',
            products: 'Add Product',
            people: 'Add Person',
            food: 'Add Food',
            quotes: 'Add Quote',
            adventures: 'Add Adventure',
            projects: 'Add Project',
            challenges: 'Add Challenge',
            skills: 'Add Skill',
            lessons: 'Add Lesson',
            photos: 'Upload Photos'
        };
        modalTitle.textContent = titles[contentType] || 'Add Item';
    }

    // Generate form based on content type
    modalBody.innerHTML = generateForm(contentType);

    // Show modal
    modal.classList.add('show');

    // Focus first input
    const firstInput = modalBody.querySelector('input, textarea, select');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function generateForm(contentType) {
    const forms = {
        books: `
            <form id="add-book-form" onsubmit="handleFormSubmit(event, 'books')">
                <div class="form-group">
                    <label for="book-title">Title *</label>
                    <input type="text" id="book-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="book-author">Author *</label>
                    <input type="text" id="book-author" name="author" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="book-category">Category</label>
                        <select id="book-category" name="category">
                            <option value="">Select category...</option>
                            <option value="Learning">Learning</option>
                            <option value="Psychology Books">Psychology</option>
                            <option value="Strategy and War">Strategy & War</option>
                            <option value="Big Ideas">Big Ideas</option>
                            <option value="Autobiographies">Autobiographies</option>
                            <option value="Fiction">Fiction</option>
                            <option value="Business">Business</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="book-rating">Rating</label>
                        <select id="book-rating" name="rating">
                            <option value="">Select rating...</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="book-review">Review</label>
                    <textarea id="book-review" name="review" placeholder="Your thoughts on this book..."></textarea>
                </div>
                <div class="form-group">
                    <label for="book-cover">Cover Image URL</label>
                    <input type="url" id="book-cover" name="coverUrl" placeholder="https://...">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Book</button>
                </div>
            </form>
        `,
        essays: `
            <form id="add-essay-form" onsubmit="handleFormSubmit(event, 'essays')">
                <div class="form-group">
                    <label for="essay-title">Title *</label>
                    <input type="text" id="essay-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="essay-slug">URL Slug</label>
                    <input type="text" id="essay-slug" name="slug" placeholder="auto-generated-from-title">
                    <span class="form-hint">Leave blank to auto-generate from title</span>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="essay-category">Category</label>
                        <select id="essay-category" name="category">
                            <option value="">Select category...</option>
                            <option value="philosophy">Philosophy</option>
                            <option value="technology">Technology</option>
                            <option value="personal">Personal</option>
                            <option value="business">Business</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="essay-status">Status</label>
                        <select id="essay-status" name="status">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="essay-excerpt">Excerpt</label>
                    <textarea id="essay-excerpt" name="excerpt" placeholder="A brief summary..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Create Essay</button>
                </div>
            </form>
        `,
        quotes: `
            <form id="add-quote-form" onsubmit="handleFormSubmit(event, 'quotes')">
                <div class="form-group">
                    <label for="quote-text">Quote *</label>
                    <textarea id="quote-text" name="text" required placeholder="Enter the quote..."></textarea>
                </div>
                <div class="form-group">
                    <label for="quote-author">Author/Source *</label>
                    <input type="text" id="quote-author" name="author" required>
                </div>
                <div class="form-group">
                    <label for="quote-source">Source (book, speech, etc.)</label>
                    <input type="text" id="quote-source" name="source" placeholder="Optional source...">
                </div>
                <div class="form-group">
                    <label for="quote-category">Category</label>
                    <select id="quote-category" name="category">
                        <option value="">Select category...</option>
                        <option value="wisdom">Wisdom</option>
                        <option value="motivation">Motivation</option>
                        <option value="philosophy">Philosophy</option>
                        <option value="business">Business</option>
                        <option value="life">Life</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Quote</button>
                </div>
            </form>
        `,
        movies: `
            <form id="add-movie-form" onsubmit="handleFormSubmit(event, 'movies')">
                <div class="form-group">
                    <label for="movie-title">Title *</label>
                    <input type="text" id="movie-title" name="title" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="movie-year">Year</label>
                        <input type="number" id="movie-year" name="year" min="1900" max="2030">
                    </div>
                    <div class="form-group">
                        <label for="movie-rating">Rating</label>
                        <select id="movie-rating" name="rating">
                            <option value="">Select rating...</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="movie-genre">Genre</label>
                    <input type="text" id="movie-genre" name="genre" placeholder="e.g., Drama, Sci-Fi">
                </div>
                <div class="form-group">
                    <label for="movie-review">Review</label>
                    <textarea id="movie-review" name="review" placeholder="Your thoughts..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Movie</button>
                </div>
            </form>
        `,
        adventures: `
            <form id="add-adventure-form" onsubmit="handleFormSubmit(event, 'adventures')">
                <div class="form-group">
                    <label for="adventure-title">Title *</label>
                    <input type="text" id="adventure-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="adventure-location">Location *</label>
                    <input type="text" id="adventure-location" name="location" required placeholder="City, Country">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="adventure-start">Start Date</label>
                        <input type="date" id="adventure-start" name="startDate">
                    </div>
                    <div class="form-group">
                        <label for="adventure-end">End Date</label>
                        <input type="date" id="adventure-end" name="endDate">
                    </div>
                </div>
                <div class="form-group">
                    <label for="adventure-description">Description</label>
                    <textarea id="adventure-description" name="description" placeholder="Describe your adventure..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Adventure</button>
                </div>
            </form>
        `,
        photos: `
            <form id="add-photos-form" onsubmit="handleFormSubmit(event, 'photos')">
                <div class="form-group">
                    <label>Upload Photos</label>
                    <div class="media-upload-area" onclick="document.getElementById('photo-input').click()">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p>Click to upload or drag and drop</p>
                        <p style="font-size: 0.85rem;">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                    <input type="file" id="photo-input" name="photos" multiple accept="image/*" style="display: none;">
                </div>
                <div id="photo-preview" class="media-gallery"></div>
                <div class="form-group">
                    <label for="photo-album">Album</label>
                    <input type="text" id="photo-album" name="album" placeholder="e.g., Travel, Life, Work">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Upload Photos</button>
                </div>
            </form>
        `
    };

    // Default form for content types without specific forms
    const defaultForm = `
        <form id="add-item-form" onsubmit="handleFormSubmit(event, '${contentType}')">
            <div class="form-group">
                <label for="item-title">Title *</label>
                <input type="text" id="item-title" name="title" required>
            </div>
            <div class="form-group">
                <label for="item-description">Description</label>
                <textarea id="item-description" name="description" placeholder="Add a description..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Item</button>
            </div>
        </form>
    `;

    return forms[contentType] || defaultForm;
}

function closeModal() {
    const modal = document.getElementById('form-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function initModalClose() {
    const modal = document.getElementById('form-modal');

    if (modal) {
        // Close on backdrop click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });
    }
}

// ==================== FORM SUBMISSION ====================

function handleFormSubmit(event, contentType) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Add timestamp
    data.createdAt = new Date().toISOString();
    data.id = generateId();

    // Save to localStorage (in a real app, this would be sent to a server)
    saveContent(contentType, data);

    // Close modal and show success
    closeModal();
    showNotification(`${contentType.slice(0, -1)} added successfully!`, 'success');

    // Refresh the section
    loadSectionContent(contentType);
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ==================== DATA STORAGE ====================

function saveContent(contentType, data) {
    const key = `admin_${contentType}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(data);
    localStorage.setItem(key, JSON.stringify(existing));

    // Update stats
    updateStats();
}

function getContent(contentType) {
    const key = `admin_${contentType}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function deleteContent(contentType, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const key = `admin_${contentType}`;
    let items = JSON.parse(localStorage.getItem(key) || '[]');
    items = items.filter(item => item.id !== id);
    localStorage.setItem(key, JSON.stringify(items));

    showNotification('Item deleted', 'success');
    loadSectionContent(contentType);
    updateStats();
}

function loadSectionContent(contentType) {
    const contentList = document.querySelector(`#section-${contentType} .content-list`);
    if (!contentList) return;

    const items = getContent(contentType);

    if (items.length === 0) {
        // Show empty state (already in HTML)
        return;
    }

    // Generate item cards
    contentList.innerHTML = items.map(item => `
        <div class="item-card">
            <div class="item-info">
                <h3>${escapeHTML(item.title || item.text || 'Untitled')}</h3>
                <div class="item-meta">
                    ${item.author ? `<span>${escapeHTML(item.author)}</span>` : ''}
                    ${item.category ? `<span>${escapeHTML(item.category)}</span>` : ''}
                    ${item.rating ? `<span class="star-rating">${'★'.repeat(item.rating)}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-edit" onclick="editContent('${escapeAttr(contentType)}', '${escapeAttr(item.id)}')">Edit</button>
                <button class="btn-delete" onclick="deleteContent('${escapeAttr(contentType)}', '${escapeAttr(item.id)}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function editContent(contentType, id) {
    // Get item data
    const items = getContent(contentType);
    const item = items.find(i => i.id === id);

    if (!item) return;

    // Show form with pre-filled data
    showAddForm(contentType);

    // Wait for form to be rendered, then fill it
    setTimeout(() => {
        const form = document.querySelector('.modal-body form');
        if (form) {
            Object.keys(item).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    input.value = item[key];
                }
            });

            // Update form submission to edit instead of add
            form.onsubmit = function(e) {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.id = id;
                data.updatedAt = new Date().toISOString();

                // Update in storage
                const key = `admin_${contentType}`;
                let items = JSON.parse(localStorage.getItem(key) || '[]');
                const index = items.findIndex(i => i.id === id);
                if (index > -1) {
                    items[index] = { ...items[index], ...data };
                    localStorage.setItem(key, JSON.stringify(items));
                }

                closeModal();
                showNotification('Item updated successfully!', 'success');
                loadSectionContent(contentType);
            };

            // Update modal title
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
                modalTitle.textContent = modalTitle.textContent.replace('Add', 'Edit');
            }

            // Update submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Save Changes';
            }
        }
    }, 100);
}

// ==================== STATS ====================

function updateStats() {
    // Count books from actual booksData if available
    const booksCount = (typeof booksData !== 'undefined') ? booksData.length : getContent('books').length;

    const stats = {
        books: booksCount,
        essays: getContent('essays').length,
        movies: getContent('movies').length,
        adventures: getContent('adventures').length
    };

    Object.keys(stats).forEach(key => {
        const el = document.getElementById(`stat-${key}`);
        if (el) {
            el.textContent = stats[key];
        }
    });
}

// ==================== NOTIFICATIONS ====================

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.admin-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <span>${escapeHTML(message)}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .admin-notification {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: var(--admin-primary);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            .admin-notification.success {
                background: var(--admin-success);
            }
            .admin-notification.error {
                background: var(--admin-danger);
            }
            .admin-notification button {
                background: transparent;
                border: none;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
                padding: 0;
                opacity: 0.8;
            }
            .admin-notification button:hover {
                opacity: 1;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ==================== SEARCH & FILTER ====================

// Initialize search functionality
document.addEventListener('DOMContentLoaded', function() {
    // Books search
    const booksSearch = document.getElementById('books-search');
    if (booksSearch) {
        booksSearch.addEventListener('input', debounce(function() {
            filterContent('books', this.value);
        }, 300));
    }

    // Books category filter
    const booksCategoryFilter = document.getElementById('books-category-filter');
    if (booksCategoryFilter) {
        booksCategoryFilter.addEventListener('change', function() {
            filterByCategory('books', this.value);
        });
    }

    // Tab filters (essays)
    const tabs = document.querySelectorAll('.filter-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const section = this.closest('.content-section').id.replace('section-', '');

            // Update active tab
            this.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Filter content
            filterByStatus(section, filter);
        });
    });

    // Update stats on load
    updateStats();
});

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function filterContent(contentType, searchTerm) {
    const items = getContent(contentType);
    const filtered = items.filter(item => {
        const searchString = `${item.title || ''} ${item.author || ''} ${item.description || ''}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    renderFilteredContent(contentType, filtered);
}

function filterByCategory(contentType, category) {
    const items = getContent(contentType);
    const filtered = category === 'all'
        ? items
        : items.filter(item => item.category === category);

    renderFilteredContent(contentType, filtered);
}

function filterByStatus(contentType, status) {
    const items = getContent(contentType);
    const filtered = status === 'all'
        ? items
        : items.filter(item => item.status === status);

    renderFilteredContent(contentType, filtered);
}

function renderFilteredContent(contentType, items) {
    const contentList = document.querySelector(`#section-${contentType} .content-list`);
    if (!contentList) return;

    if (items.length === 0) {
        contentList.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <p>No items found</p>
            </div>
        `;
        return;
    }

    contentList.innerHTML = items.map(item => `
        <div class="item-card">
            <div class="item-info">
                <h3>${item.title || item.text || 'Untitled'}</h3>
                <div class="item-meta">
                    ${item.author ? `<span>${item.author}</span>` : ''}
                    ${item.category ? `<span>${item.category}</span>` : ''}
                    ${item.status ? `<span class="status-badge ${item.status}">${item.status}</span>` : ''}
                    ${item.rating ? `<span class="star-rating">${'★'.repeat(item.rating)}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-edit" onclick="editContent('${contentType}', '${item.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteContent('${contentType}', '${item.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}
