// Book Importer - Handles CSV/Excel file imports for book data

let importedBooks = [];
let generatedBooksJSON = '';

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
    generatedBooksJSON = '';

    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-result').style.display = 'none';
    document.getElementById('import-dropzone').style.display = 'block';
    document.getElementById('book-file-input').value = '';
}

// Apply the import and generate data/books.json
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

    generatedBooksJSON = `${JSON.stringify(finalBooks, null, 2)}\n`;

    // Show result
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-result').style.display = 'block';

    const mergeNote = mergeWithExisting ? `Merged ${importedBooks.length} new books with existing library.` : `Replaced with ${importedBooks.length} books.`;
    document.getElementById('result-message').textContent = `${mergeNote} Total: ${finalBooks.length} books.`;
}

// Download books.json file
function downloadBooksJSON() {
    if (!generatedBooksJSON) {
        alert('No books to download.');
        return;
    }

    const blob = new Blob([generatedBooksJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Copy books.json to clipboard
function copyBooksJSON(event) {
    if (!generatedBooksJSON) {
        alert('No books to copy.');
        return;
    }

    navigator.clipboard.writeText(generatedBooksJSON).then(() => {
        const btn = event?.target?.closest('button');
        if (!btn) return;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }).catch(() => {
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
