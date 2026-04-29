// Admin dashboard forms, storage, and section content

function showAddForm(contentType) {
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalBody) return;

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

    modalBody.innerHTML = generateForm(contentType);
    modal.classList.add('show');

    const firstInput = modalBody.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function generateForm(contentType) {
    const forms = {
        books: `
            <form id="add-book-form" data-admin-form="content" data-content-type="books">
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
                    <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">Add Book</button>
                </div>
            </form>
        `,
        essays: `
            <form id="add-essay-form" data-admin-form="content" data-content-type="essays">
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
                    <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">Create Essay</button>
                </div>
            </form>
        `,
        quotes: `
            <form id="add-quote-form" data-admin-form="content" data-content-type="quotes">
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
                    <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">Add Quote</button>
                </div>
            </form>
        `,
        movies: `
            <form id="add-movie-form" data-admin-form="content" data-content-type="movies">
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
                    <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">Add Movie</button>
                </div>
            </form>
        `,
        adventures: `
            <form id="add-adventure-form" data-admin-form="content" data-content-type="adventures">
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
                    <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">Add Adventure</button>
                </div>
            </form>
        `,
        photos: `
            <form id="add-photos-form" data-admin-form="content" data-content-type="photos">
                <div class="form-group">
                    <label>Upload Photos</label>
                    <div class="media-upload-area" data-admin-action="open-photo-input">
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
                    <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">Upload Photos</button>
                </div>
            </form>
        `
    };

    const defaultForm = `
        <form id="add-item-form" data-admin-form="content" data-content-type="${escapeAttr(contentType)}">
            <div class="form-group">
                <label for="item-title">Title *</label>
                <input type="text" id="item-title" name="title" required>
            </div>
            <div class="form-group">
                <label for="item-description">Description</label>
                <textarea id="item-description" name="description" placeholder="Add a description..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" data-admin-action="close-modal">Cancel</button>
                <button type="submit" class="btn-primary">Add Item</button>
            </div>
        </form>
    `;

    return forms[contentType] || defaultForm;
}

function closeModal() {
    const modal = document.getElementById('form-modal');
    if (modal) modal.classList.remove('show');
}

function initModalClose() {
    const modal = document.getElementById('form-modal');
    if (!modal) return;

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}

function handleFormSubmit(event, contentType) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (form.dataset.mode === 'edit') {
        const id = form.dataset.itemId;
        data.id = id;
        data.updatedAt = new Date().toISOString();

        const key = `admin_${contentType}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        const index = items.findIndex((item) => item.id === id);
        if (index > -1) {
            items[index] = { ...items[index], ...data };
            localStorage.setItem(key, JSON.stringify(items));
        }

        closeModal();
        showNotification('Item updated successfully!', 'success');
        loadSectionContent(contentType);
        return;
    }

    data.createdAt = new Date().toISOString();
    data.id = generateId();
    saveContent(contentType, data);
    closeModal();
    showNotification(`${contentType.slice(0, -1)} added successfully!`, 'success');
    loadSectionContent(contentType);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function saveContent(contentType, data) {
    const key = `admin_${contentType}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(data);
    localStorage.setItem(key, JSON.stringify(existing));
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
    items = items.filter((item) => item.id !== id);
    localStorage.setItem(key, JSON.stringify(items));

    showNotification('Item deleted', 'success');
    loadSectionContent(contentType);
    updateStats();
}

function loadSectionContent(contentType) {
    const contentList = document.querySelector(`#section-${contentType} .content-list`);
    if (!contentList) return;

    const items = getContent(contentType);
    if (items.length === 0) return;

    contentList.innerHTML = items.map((item) => `
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
                <button class="btn-edit" data-admin-action="edit-content" data-content-type="${escapeAttr(contentType)}" data-item-id="${escapeAttr(item.id)}">Edit</button>
                <button class="btn-delete" data-admin-action="delete-content" data-content-type="${escapeAttr(contentType)}" data-item-id="${escapeAttr(item.id)}">Delete</button>
            </div>
        </div>
    `).join('');
}

function editContent(contentType, id) {
    const items = getContent(contentType);
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    showAddForm(contentType);
    setTimeout(() => {
        const form = document.querySelector('.modal-body form');
        if (!form) return;

        Object.keys(item).forEach((key) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = item[key];
        });

        form.dataset.mode = 'edit';
        form.dataset.itemId = id;

        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = modalTitle.textContent.replace('Add', 'Edit');

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Save Changes';
    }, 100);
}

function updateStats() {
    const booksCount = typeof booksData !== 'undefined' ? booksData.length : getContent('books').length;
    const stats = {
        books: booksCount,
        essays: getContent('essays').length,
        movies: getContent('movies').length,
        adventures: getContent('adventures').length
    };

    Object.keys(stats).forEach((key) => {
        const el = document.getElementById(`stat-${key}`);
        if (el) el.textContent = stats[key];
    });
}

function initDashboardFilters() {
    const tabs = document.querySelectorAll('.filter-tabs .tab');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;
            const section = tab.closest('.content-section').id.replace('section-', '');

            tab.parentElement.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
            filterByStatus(section, filter);
        });
    });
}

function filterContent(contentType, searchTerm) {
    const items = getContent(contentType);
    const filtered = items.filter((item) => {
        const searchString = `${item.title || ''} ${item.author || ''} ${item.description || ''}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });
    renderFilteredContent(contentType, filtered);
}

function filterByCategory(contentType, category) {
    const items = getContent(contentType);
    const filtered = category === 'all'
        ? items
        : items.filter((item) => item.category === category);
    renderFilteredContent(contentType, filtered);
}

function filterByStatus(contentType, status) {
    const items = getContent(contentType);
    const filtered = status === 'all'
        ? items
        : items.filter((item) => item.status === status);
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

    contentList.innerHTML = items.map((item) => `
        <div class="item-card">
            <div class="item-info">
                <h3>${escapeHTML(item.title || item.text || 'Untitled')}</h3>
                <div class="item-meta">
                    ${item.author ? `<span>${escapeHTML(item.author)}</span>` : ''}
                    ${item.category ? `<span>${escapeHTML(item.category)}</span>` : ''}
                    ${item.status ? `<span class="status-badge ${escapeAttr(item.status)}">${escapeHTML(item.status)}</span>` : ''}
                    ${item.rating ? `<span class="star-rating">${'★'.repeat(item.rating)}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-admin-action="edit-content" data-content-type="${escapeAttr(contentType)}" data-item-id="${escapeAttr(item.id)}">Edit</button>
                <button class="btn-delete" data-admin-action="delete-content" data-content-type="${escapeAttr(contentType)}" data-item-id="${escapeAttr(item.id)}">Delete</button>
            </div>
        </div>
    `).join('');
}
