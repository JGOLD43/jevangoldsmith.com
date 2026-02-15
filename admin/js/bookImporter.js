// Book Importer - Handles CSV/Excel file imports for book data

let importedBooks = [];
let generatedBooksJS = '';

// Toggle import panel visibility
function toggleImportPanel() {
    const panel = document.getElementById('book-import-panel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
    } else {
        panel.style.display = 'none';
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parseExcel(file);
    } else {
        alert('Please upload a CSV or Excel file.');
    }
}

// Parse CSV file
function parseCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');

        if (lines.length < 2) {
            alert('CSV file appears to be empty or invalid.');
            return;
        }

        // Parse header row
        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

        // Find column indices
        const columnMap = {
            title: findColumn(headers, ['title', 'book title', 'name']),
            author: findColumn(headers, ['author', 'writer', 'by']),
            isbn: findColumn(headers, ['isbn', 'isbn13', 'isbn-13', 'isbn10']),
            year: findColumn(headers, ['year', 'published', 'publication year', 'pub year']),
            rating: findColumn(headers, ['rating', 'stars', 'score', 'my rating']),
            reReads: findColumn(headers, ['rereads', 're-reads', 'times read', 'read count']),
            category: findColumn(headers, ['category', 'genre', 'shelf', 'bookshelf']),
            shortDescription: findColumn(headers, ['shortdescription', 'short description', 'description', 'summary']),
            review: findColumn(headers, ['review', 'my review', 'notes', 'thoughts'])
        };

        // Validate required columns
        if (columnMap.title === -1 || columnMap.author === -1) {
            alert('CSV must have at least "title" and "author" columns.');
            return;
        }

        // Parse data rows
        importedBooks = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);
            const book = extractBookData(values, columnMap);

            if (book.title && book.author) {
                importedBooks.push(book);
            }
        }

        showPreview();
    };
    reader.readAsText(file);
}

// Parse a single CSV line (handling quoted values)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());

    return values;
}

// Find column index by possible names
function findColumn(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.indexOf(name.toLowerCase());
        if (index !== -1) return index;
    }
    return -1;
}

// Extract book data from row values
function extractBookData(values, columnMap) {
    const getValue = (key) => {
        const index = columnMap[key];
        return index !== -1 && values[index] ? values[index].trim() : '';
    };

    // Clean ISBN - remove hyphens and spaces
    let isbn = getValue('isbn').replace(/[-\s]/g, '');

    // If ISBN doesn't start with 97, try to format it
    if (isbn && isbn.length === 10) {
        // Convert ISBN-10 to ISBN-13
        isbn = '978' + isbn.slice(0, 9);
    }

    // Parse rating (handle various formats)
    let rating = parseInt(getValue('rating')) || 0;
    if (rating > 5) rating = 5;
    if (rating < 0) rating = 0;

    // Parse re-reads
    let reReads = parseInt(getValue('reReads')) || 0;
    if (reReads < 0) reReads = 0;

    // Parse year
    const yearStr = getValue('year');
    const year = yearStr ? yearStr.match(/\d{4}/)?.[0] || '' : '';

    return {
        title: getValue('title'),
        author: getValue('author'),
        isbn: isbn,
        year: year,
        rating: rating,
        reReads: reReads,
        category: getValue('category') || 'Uncategorized',
        shortDescription: getValue('shortDescription'),
        review: getValue('review') || null
    };
}

// Parse Excel file using SheetJS
function parseExcel(file) {
    // Check if SheetJS is loaded
    if (typeof XLSX === 'undefined') {
        // Dynamically load SheetJS with SRI
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.integrity = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';
        script.crossOrigin = 'anonymous';
        script.onload = () => parseExcelWithLibrary(file);
        script.onerror = () => alert('Failed to load Excel parser. Please try a CSV file instead.');
        document.head.appendChild(script);
    } else {
        parseExcelWithLibrary(file);
    }
}

// Parse Excel with SheetJS library
function parseExcelWithLibrary(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (json.length < 2) {
                alert('Excel file appears to be empty or invalid.');
                return;
            }

            // Parse header row
            const headers = json[0].map(h => String(h || '').trim().toLowerCase());

            // Find column indices
            const columnMap = {
                title: findColumn(headers, ['title', 'book title', 'name']),
                author: findColumn(headers, ['author', 'writer', 'by']),
                isbn: findColumn(headers, ['isbn', 'isbn13', 'isbn-13', 'isbn10']),
                year: findColumn(headers, ['year', 'published', 'publication year', 'pub year']),
                rating: findColumn(headers, ['rating', 'stars', 'score', 'my rating']),
                reReads: findColumn(headers, ['rereads', 're-reads', 'times read', 'read count']),
                category: findColumn(headers, ['category', 'genre', 'shelf', 'bookshelf']),
                shortDescription: findColumn(headers, ['shortdescription', 'short description', 'description', 'summary']),
                review: findColumn(headers, ['review', 'my review', 'notes', 'thoughts'])
            };

            // Validate required columns
            if (columnMap.title === -1 || columnMap.author === -1) {
                alert('Excel file must have at least "title" and "author" columns.');
                return;
            }

            // Parse data rows
            importedBooks = [];
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length === 0) continue;

                const values = row.map(v => String(v || ''));
                const book = extractBookData(values, columnMap);

                if (book.title && book.author) {
                    importedBooks.push(book);
                }
            }

            showPreview();
        } catch (error) {
            console.error('Excel parsing error:', error);
            alert('Error parsing Excel file. Please check the file format.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Show preview of imported books
function showPreview() {
    const previewSection = document.getElementById('import-preview');
    const tbody = document.getElementById('preview-tbody');
    const countSpan = document.getElementById('preview-count');

    // Update count
    countSpan.textContent = importedBooks.length;

    // Build table rows
    tbody.innerHTML = importedBooks.map(book => `
        <tr>
            <td>${escapeHtml(book.title)}</td>
            <td>${escapeHtml(book.author)}</td>
            <td>${escapeHtml(book.isbn || '-')}</td>
            <td>${escapeHtml(book.year || '-')}</td>
            <td>${book.rating ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : '-'}</td>
            <td>${escapeHtml(book.category)}</td>
        </tr>
    `).join('');

    // Show preview section
    previewSection.style.display = 'block';

    // Hide dropzone
    document.getElementById('import-dropzone').style.display = 'none';
}

// Escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Clear import and reset
function clearImport() {
    importedBooks = [];
    generatedBooksJS = '';

    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-result').style.display = 'none';
    document.getElementById('import-dropzone').style.display = 'block';
    document.getElementById('book-file-input').value = '';
}

// Apply the import and generate books.js
function applyImport() {
    if (importedBooks.length === 0) {
        alert('No books to import.');
        return;
    }

    const mergeWithExisting = document.getElementById('merge-books').checked;

    let finalBooks = [];

    if (mergeWithExisting && typeof booksData !== 'undefined') {
        // Merge: add imported books, avoiding duplicates by ISBN or title+author
        finalBooks = [...booksData];

        importedBooks.forEach(newBook => {
            const isDuplicate = finalBooks.some(existingBook => {
                if (newBook.isbn && existingBook.isbn) {
                    return newBook.isbn === existingBook.isbn;
                }
                return existingBook.title.toLowerCase() === newBook.title.toLowerCase() &&
                       existingBook.author.toLowerCase() === newBook.author.toLowerCase();
            });

            if (!isDuplicate) {
                finalBooks.push(newBook);
            }
        });
    } else {
        finalBooks = importedBooks;
    }

    // Generate books.js content
    generatedBooksJS = generateBooksJSContent(finalBooks);

    // Show result
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-result').style.display = 'block';

    const mergeNote = mergeWithExisting ? `Merged ${importedBooks.length} new books with existing library.` : `Replaced with ${importedBooks.length} books.`;
    document.getElementById('result-message').textContent = `${mergeNote} Total: ${finalBooks.length} books.`;
}

// Generate the books.js file content
function generateBooksJSContent(books) {
    const booksArray = books.map(book => {
        const reviewStr = book.review
            ? `\`${book.review.replace(/`/g, '\\`')}\``
            : 'null';

        return `    {
        title: "${escapeJSString(book.title)}",
        author: "${escapeJSString(book.author)}",
        isbn: "${book.isbn || ''}",
        year: "${book.year || ''}",
        rating: ${book.rating || 0},
        reReads: ${book.reReads || 0},
        category: "${escapeJSString(book.category)}",
        shortDescription: "${escapeJSString(book.shortDescription || '')}",
        review: ${reviewStr}
    }`;
    }).join(',\n');

    return `// Book Library Data
// Add your books here - each book can have an optional review
// Covers will be fetched automatically from Open Library API using ISBN
const booksData = [
${booksArray}
];

${getBooksJSFunctions()}`;
}

// Escape strings for JavaScript
function escapeJSString(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

// Get the rest of books.js functions (they stay the same)
function getBooksJSFunctions() {
    return `
// Get cover URL from ISBN using Open Library Covers API
function getCoverUrl(isbn) {
    if (!isbn) return null;
    // Remove hyphens from ISBN
    const cleanIsbn = isbn.replace(/-/g, '');
    // Open Library Covers API - returns high quality covers
    return \`https://covers.openlibrary.org/b/isbn/\${cleanIsbn}-L.jpg\`;
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
        const countEl = document.getElementById(\`count-\${catKey}\`);
        if (countEl) {
            countEl.textContent = count;
            const section = countEl.closest('.sidebar-section');
            if (section) {
                section.style.display = count === 0 ? 'none' : 'block';
            }
        }
    });

    // Populate category lists
    Object.values(categoryMap).forEach(catKey => {
        const container = document.getElementById(\`category-\${catKey}\`);
        if (!container || categories[catKey].length === 0) return;

        container.innerHTML = categories[catKey].map(book => \`
            <a href="#" class="book-link" onclick="scrollToBook('\${book.title.replace(/'/g, "\\\\'")}', event)">
                <div>\${book.title}</div>
                <div class="book-link-author">\${book.author}</div>
            </a>
        \`).join('');
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.setAttribute('data-isbn', book.isbn);
    if (book.review) {
        card.classList.add('has-review');
        card.style.cursor = 'pointer';
        card.onclick = () => openBookModal(book);
    }

    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    const coverUrl = getCoverUrl(book.isbn);

    let timesReadBadge = '';
    const timesRead = (book.reReads || 0) + 1;
    if (timesRead > 1) {
        timesReadBadge = \`<div class="times-read-badge">📖 \${timesRead}x Read</div>\`;
    }

    card.innerHTML = \`
        \${timesReadBadge}
        <div class="book-cover-wrapper">
            <img src="\${coverUrl}" alt="\${book.title}" class="book-cover" loading="lazy" decoding="async" onerror="this.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center'; this.style.color='white'; this.style.fontWeight='bold'; this.style.padding='2rem'; this.style.textAlign='center'; this.innerHTML='\${book.title}';">
        </div>
        <div class="book-info">
            <div class="book-title-row">
                <h3 class="book-title">\${book.title}</h3>
                \${book.year ? \`<span class="book-year">\${book.year}</span>\` : ''}
            </div>
            <p class="book-author">by \${book.author}</p>
            <div class="book-rating"><span class="rating-number">\${book.rating}</span> \${stars}</div>
            \${book.review ? \`<p class="book-description">\${book.shortDescription}</p>\` : ''}
            \${book.review ? '<button class="read-review-btn">Read My Review</button>' : ''}
        </div>
    \`;

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
    modalAuthor.textContent = \`by \${book.author}\${book.year ? \` (\${book.year})\` : ''}\`;
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
        closeCategoryModal();
    }
});

// Filter interaction state
let isDragging = false;

// Search books
function searchBooks(query) {
    currentSearchQuery = query.trim();
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';
    }
    activeCategory = 'all';
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
}

function clearSearch() {
    currentSearchQuery = '';
    const searchInput = document.getElementById('book-search');
    const clearBtn = document.getElementById('search-clear-btn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
}

function setStarFilter(rating) {
    currentStarFilter = rating;
    activeCategory = 'all';
    updateStarFilterDisplay();
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) ratingText.textContent = \`\${rating}+\`;
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
    document.querySelectorAll('.category-books').forEach(div => div.classList.remove('expanded'));
    document.querySelector('[onclick*="toggleBookCategory(\\'all\\')"]')?.classList.add('active');
}

function clearStarFilter() {
    currentStarFilter = 'all';
    activeCategory = 'all';
    updateStarFilterDisplay();
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) ratingText.textContent = '';
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
    document.querySelectorAll('.category-books').forEach(div => div.classList.remove('expanded'));
    document.querySelector('[onclick*="toggleBookCategory(\\'all\\')"]')?.classList.add('active');
}

function setReReadsFilter(count) {
    currentReReadsFilter = count;
    activeCategory = 'all';
    updateReReadsFilterDisplay();
    const timesreadText = document.getElementById('filter-timesread-text');
    if (timesreadText) timesreadText.textContent = count >= 10 ? '10' : \`\${count}\`;
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
    document.querySelectorAll('.category-books').forEach(div => div.classList.remove('expanded'));
    document.querySelector('[onclick*="toggleBookCategory(\\'all\\')"]')?.classList.add('active');
}

function clearReReadsFilter() {
    currentReReadsFilter = 'all';
    activeCategory = 'all';
    updateReReadsFilterDisplay();
    const timesreadText = document.getElementById('filter-timesread-text');
    if (timesreadText) timesreadText.textContent = '';
    populateSidebar();
    const filtered = getFilteredBooks();
    renderBooks(filtered);
    updateBookCount(filtered.length, 'all');
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
    document.querySelectorAll('.category-books').forEach(div => div.classList.remove('expanded'));
    document.querySelector('[onclick*="toggleBookCategory(\\'all\\')"]')?.classList.add('active');
}

function updateReReadsFilterDisplay() {
    const slider = document.getElementById('timesread-slider');
    if (slider) slider.value = currentReReadsFilter === 'all' ? 0 : currentReReadsFilter;
}

function updateStarFilterDisplay() {
    const stars = document.querySelectorAll('.filter-star');
    stars.forEach((star) => {
        const starNumber = parseInt(star.getAttribute('data-star'));
        star.classList.remove('full', 'half');
        if (currentStarFilter === 'all') return;
        if (starNumber <= Math.floor(currentStarFilter)) {
            star.classList.add('full');
        } else if (starNumber === Math.ceil(currentStarFilter) && currentStarFilter % 1 === 0.5) {
            star.classList.add('half');
        }
    });
}

function initStarFilter() {
    const container = document.getElementById('star-filter-container');
    if (!container) return;
    const stars = container.querySelectorAll('.filter-star');
    stars.forEach((star) => {
        star.addEventListener('click', (e) => {
            const starNumber = parseInt(star.getAttribute('data-star'));
            const rect = star.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isLeftHalf = clickX < rect.width / 2;
            const rating = isLeftHalf ? starNumber - 0.5 : starNumber;
            setStarFilter(rating);
        });
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
    document.addEventListener('mouseup', () => { isDragging = false; });
}

function initReReadsFilter() {
    const slider = document.getElementById('timesread-slider');
    if (!slider) return;
    slider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        if (count === 0) { clearReReadsFilter(); }
        else { setReReadsFilter(count); }
    });
}

function showArrowFlash(button, isExpanding) {
    const existingArrow = button.querySelector('.arrow-flash');
    if (existingArrow) existingArrow.remove();
    const arrow = document.createElement('span');
    arrow.className = 'arrow-flash';
    arrow.textContent = isExpanding ? '▲' : '▼';
    button.appendChild(arrow);
    setTimeout(() => arrow.remove(), 500);
}

function toggleBookCategory(category) {
    const filteredBooks = getFilteredBooks();
    activeCategory = category;
    if (category === 'all') {
        renderBooks(filteredBooks);
        updateBookCount(filteredBooks.length, 'all');
        document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
        document.querySelectorAll('.category-books').forEach(div => div.classList.remove('expanded'));
        event.target.closest('.sidebar-category').classList.add('active');
        return;
    }
    const button = event.target.closest('.sidebar-category');
    const container = document.getElementById(\`category-\${category}\`);
    if (!container) return;
    const fullCategoryName = Object.keys(categoryMap).find(k => categoryMap[k] === category);
    const categoryBooks = filteredBooks.filter(book => book.category === fullCategoryName);
    const isExpanded = container.classList.contains('expanded');
    showArrowFlash(button, !isExpanded);
    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
        activeCategory = 'all';
        renderBooks(filteredBooks);
        updateBookCount(filteredBooks.length, 'all');
    } else {
        document.querySelectorAll('.category-books').forEach(div => div.classList.remove('expanded'));
        document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('expanded'));
        container.classList.add('expanded');
        button.classList.add('expanded');
        renderBooks(categoryBooks);
        updateBookCount(categoryBooks.length, category);
    }
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function scrollToBook(bookTitle, event) {
    if (event) event.preventDefault();
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
        targetCard.style.transform = 'scale(1.05)';
        targetCard.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.3)';
        setTimeout(() => {
            targetCard.style.transform = '';
            targetCard.style.boxShadow = '';
        }, 2000);
        document.querySelectorAll('.book-link').forEach(link => link.classList.remove('active'));
        event.target.closest('.book-link').classList.add('active');
    }
}

let activeCategory = 'all';

function updateBookCount(count = null, categoryName = null) {
    const countElement = document.getElementById('book-count');
    const labelElement = document.getElementById('counter-label');
    if (countElement) {
        countElement.textContent = count !== null ? count : booksData.length;
    }
    if (labelElement) {
        labelElement.textContent = (categoryName && categoryName !== 'all') ? 'Books Read' : 'Total Books Read';
    }
}

function clearAllFilters() {
    currentStarFilter = 'all';
    currentReReadsFilter = 'all';
    currentSearchQuery = '';
    activeCategory = 'all';
    const searchInput = document.getElementById('book-search');
    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';
    updateStarFilterDisplay();
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) ratingText.textContent = '';
    const slider = document.getElementById('timesread-slider');
    if (slider) slider.value = 0;
    const timesreadText = document.getElementById('filter-timesread-text');
    if (timesreadText) timesreadText.textContent = '';
    populateSidebar();
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active', 'expanded'));
    document.querySelectorAll('.category-books').forEach(section => section.classList.remove('expanded'));
    document.querySelector('[onclick*="toggleBookCategory(\\'all\\')"]')?.classList.add('active');
    renderBooks();
    updateBookCount(booksData.length, 'all');
}

function toggleSidebar() {
    const layout = document.getElementById('books-layout');
    const sidebar = document.getElementById('books-sidebar');
    layout.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('books-sidebar-collapsed', isCollapsed);
}

function toggleListDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    dropdown.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('list-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

function initCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    const recentBooks = booksData.slice(0, 6);
    const allBooks = [...recentBooks, ...recentBooks];
    track.innerHTML = allBooks.map(book => {
        const coverUrl = \`https://covers.openlibrary.org/b/isbn/\${book.isbn}-M.jpg\`;
        return \`<img class="carousel-book" src="\${coverUrl}" alt="\${book.title}" title="\${book.title} by \${book.author}" decoding="async" onclick="scrollToBook('\${book.isbn}')">\`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderBooks();
    populateSidebar();
    initStarFilter();
    initReReadsFilter();
    initCarousel();
    updateBookCount(booksData.length, 'all');
});

let currentViewMode = 'list';

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
        booksMain.style.display = 'none';
        categoryGridView.style.display = 'block';
        sidebar.style.display = 'none';
        booksLayout.classList.add('grid-view-active');
        renderCategoryGrid();
    } else {
        booksMain.style.display = 'block';
        categoryGridView.style.display = 'none';
        sidebar.style.display = 'block';
        booksLayout.classList.remove('grid-view-active');
    }
}

function getBooksByCategory() {
    const categories = {};
    booksData.forEach(book => {
        const cat = book.category || 'Uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(book);
    });
    return categories;
}

function renderCategoryGrid() {
    const container = document.getElementById('category-grid');
    const booksByCategory = getBooksByCategory();
    const sortedCategories = Object.entries(booksByCategory).sort((a, b) => b[1].length - a[1].length);
    container.innerHTML = sortedCategories.map(([category, books]) => {
        const previewBooks = books.slice(0, 8);
        const displayName = categoryDisplayNames[category] || category;
        const bookCovers = previewBooks.map(book => {
            const coverUrl = \`https://covers.openlibrary.org/b/isbn/\${book.isbn}-M.jpg\`;
            return \`<img src="\${coverUrl}" alt="\${book.title}" loading="lazy" decoding="async">\`;
        }).join('');
        const emptySlots = Array(Math.max(0, 8 - previewBooks.length)).fill('<div class="empty-slot"></div>').join('');
        return \`
            <div class="category-card" onclick="openCategoryModal('\${category.replace(/'/g, "\\\\'")}')">
                <div class="category-card-books">\${bookCovers}\${emptySlots}</div>
                <div class="category-card-info">
                    <span class="category-card-name">\${displayName}</span>
                    <span class="category-card-count">\${books.length}</span>
                </div>
            </div>
        \`;
    }).join('');
}

function openCategoryModal(category) {
    const booksByCategory = getBooksByCategory();
    const books = booksByCategory[category] || [];
    const displayName = categoryDisplayNames[category] || category;
    let modal = document.getElementById('category-expanded-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'category-expanded-modal';
        modal.className = 'category-expanded';
        document.body.appendChild(modal);
    }
    modal.innerHTML = \`
        <div class="category-modal-backdrop" onclick="closeCategoryModal()"></div>
        <div class="category-modal-content" onclick="event.stopPropagation()">
            <div class="category-expanded-header">
                <h2 class="category-expanded-title">\${displayName}</h2>
                <button class="category-expanded-close" onclick="closeCategoryModal()">&times;</button>
            </div>
            <div class="category-expanded-books">
                \${books.map(book => {
                    const coverUrl = \`https://covers.openlibrary.org/b/isbn/\${book.isbn}-L.jpg\`;
                    return \`<div class="category-expanded-book" onclick="openBookFromGrid('\${book.isbn}')"><img src="\${coverUrl}" alt="\${book.title}" title="\${book.title} by \${book.author}" decoding="async"></div>\`;
                }).join('')}
            </div>
        </div>
    \`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCategoryModal() {
    const modal = document.getElementById('category-expanded-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openBookFromGrid(isbn) {
    const book = booksData.find(b => b.isbn === isbn);
    if (book) {
        closeCategoryModal();
        openBookModal(book);
    }
}`;
}

// Download books.js file
function downloadBooksJS() {
    if (!generatedBooksJS) {
        alert('No books to download.');
        return;
    }

    const blob = new Blob([generatedBooksJS], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Copy books.js to clipboard
function copyBooksJS() {
    if (!generatedBooksJS) {
        alert('No books to copy.');
        return;
    }

    navigator.clipboard.writeText(generatedBooksJS).then(() => {
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }).catch(err => {
        alert('Failed to copy. Please try downloading instead.');
    });
}

// Download template CSV
function downloadTemplate() {
    const template = `title,author,isbn,year,rating,reReads,category,shortDescription,review
"Atomic Habits","James Clear","9780735211292","2018","5","2","Learning","A transformative guide to building good habits.","My detailed review here..."
"The Lean Startup","Eric Ries","9780307887894","2011","4","0","Strategy and War","Essential reading for entrepreneurs.",""`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize drag and drop
document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('import-dropzone');
    if (!dropzone) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight dropzone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    // Handle drop
    dropzone.addEventListener('drop', handleDrop, false);

    // Handle click on browse link
    dropzone.addEventListener('click', () => {
        document.getElementById('book-file-input').click();
    });
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const input = document.getElementById('book-file-input');
        input.files = files;
        handleFileSelect({ target: input });
    }
}
