// Admin dashboard books integration

async function loadBooksFromData() {
    if (typeof loadBooksData === 'function') {
        try {
            await loadBooksData();
        } catch (error) {
            console.warn('Unable to load books data', error);
        }
    }

    if (typeof booksData === 'undefined') {
        console.warn('booksData not found - books runtime may not be loaded');
        return;
    }

    populateBookCategories();
    displayBooks(booksData);

    const searchInput = document.getElementById('books-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            filterBooks();
        }, 300));
    }

    const categoryFilter = document.getElementById('books-category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterBooks);
    }
}

function populateBookCategories() {
    const categoryFilter = document.getElementById('books-category-filter');
    if (!categoryFilter || typeof booksData === 'undefined') return;

    const categories = [...new Set(booksData.map((book) => book.category))].sort();
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach((category) => {
        categoryFilter.innerHTML += `<option value="${escapeAttr(category)}">${escapeHTML(category)}</option>`;
    });
}

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

    booksList.innerHTML = books.map((book) => `
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
                <button class="btn-edit" data-admin-action="edit-book" data-isbn="${escapeAttr(book.isbn)}">Edit</button>
            </div>
        </div>
    `).join('');
}

function filterBooks() {
    if (typeof booksData === 'undefined') return;

    const searchTerm = document.getElementById('books-search')?.value?.toLowerCase() || '';
    const category = document.getElementById('books-category-filter')?.value || 'all';

    let filtered = booksData;
    if (searchTerm) {
        filtered = filtered.filter((book) => (
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm)
        ));
    }

    if (category !== 'all') {
        filtered = filtered.filter((book) => book.category === category);
    }

    displayBooks(filtered);
}

function editBook(isbn) {
    const book = booksData.find((item) => item.isbn === isbn);
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
                <strong>Note:</strong> Book data is stored in <code>data/books.json</code>. Use the importer to export a replacement JSON file, then redeploy your site.
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" data-admin-action="close-modal">Close</button>
            </div>
        </form>
    `;

    modal.classList.add('show');
}
