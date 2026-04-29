(function () {
    const categoryDisplayNames = {
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
        'Patience and Clear Thinking': 'Patience and Clear Thinking',
        'Persuasion': 'Persuasion',
        'Psychology Books': 'Psychology',
        'Science': 'Science',
        'Storytelling': 'Storytelling',
        'Strategy and War': 'Strategy',
        'Who Am I?': 'Who Am I?'
    };

    function create(controller) {
        let currentViewMode = 'list';

        function createBookCard(book) {
            const card = document.createElement('div');
            card.className = 'book-card js-zoom-item';
            card.setAttribute('data-isbn', book.isbn);
            card.setAttribute('data-id', book.isbn || book.title);
            card.setAttribute('data-title', book.title);
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.style.cursor = 'pointer';

            if (book.review) {
                card.classList.add('has-review');
            }

            const isRead = book.read !== false;
            if (!isRead) {
                card.classList.add('book-card-unread');
            }

            const ratingNumber = Number(book.rating) || 0;
            const stars = '★'.repeat(ratingNumber) + '☆'.repeat(Math.max(0, 5 - ratingNumber));
            const coverUrl = controller.getCoverUrl(book);
            const timesRead = Number(book.reReads || 0) + 1;
            const cornerBadge = !isRead
                ? '<div class="to-read-badge">📚 To Read</div>'
                : (timesRead > 1
                    ? `<div class="times-read-badge">📖 ${timesRead}x Read</div>`
                    : '');
            const detailBody = book.review || book.shortDescription || `${book.title} by ${book.author}`;
            const detailLabel = book.review ? 'Review' : 'Notes';

            card.innerHTML = `
                ${cornerBadge}
                <div class="book-cover-wrapper" data-title="${escapeAttr(book.title)}">
                    <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" class="book-cover" loading="lazy" decoding="async" data-book-cover-fallback="true">
                    <div class="js-zoom-detail" aria-hidden="true">
                        <p class="zoom-detail-kicker">${escapeHTML(book.author)}${book.year ? ' · ' + escapeHTML(book.year) : ''}</p>
                        <p class="zoom-detail-title">${escapeHTML(book.title)}</p>
                        ${isRead ? `<p class="zoom-detail-lead">${stars}</p>` : '<p class="zoom-detail-lead zoom-detail-toread">To Read</p>'}
                        <p class="zoom-detail-line"><span>${detailLabel} —</span> ${escapeHTML(detailBody)}</p>
                    </div>
                </div>
                <div class="book-info">
                    <div class="book-title-row">
                        <h3 class="book-title">${escapeHTML(book.title)}</h3>
                        ${book.year ? `<span class="book-year">${escapeHTML(book.year)}</span>` : ''}
                    </div>
                    <p class="book-author">by ${escapeHTML(book.author)}</p>
                    ${isRead ? `<div class="book-rating"><span class="rating-number">${ratingNumber}</span> ${stars}</div>` : '<div class="book-status-toread">To Read</div>'}
                    ${book.review ? `<p class="book-description">${escapeHTML(book.shortDescription)}</p>` : ''}
                </div>
            `;

            return card;
        }

        function renderBooks(books) {
            const container = document.getElementById('books-container');
            if (!container) return;

            container.innerHTML = '';
            books.forEach((book) => {
                container.appendChild(createBookCard(book));
            });
        }

        function renderSidebar(categories) {
            const countAll = document.getElementById('count-all');
            if (countAll) {
                const total = Object.values(categories).reduce((sum, books) => sum + books.length, 0);
                countAll.textContent = total;
            }

            Object.keys(categories).forEach((categoryKey) => {
                const books = categories[categoryKey];
                const countElement = document.getElementById(`count-${categoryKey}`);
                const section = countElement?.closest('.sidebar-section');
                const container = document.getElementById(`category-${categoryKey}`);

                if (countElement) {
                    countElement.textContent = books.length;
                }

                if (section) {
                    section.style.display = books.length === 0 ? 'none' : 'block';
                }

                if (container) {
                    container.innerHTML = books.map((book) => `
                        <a href="#" class="book-link" data-action="book-link" data-book-title="${escapeAttr(book.title)}">
                            <div>${escapeHTML(book.title)}</div>
                            <div class="book-link-author">${escapeHTML(book.author)}</div>
                        </a>
                    `).join('');
                }
            });
        }

        function renderCarousel(books) {
            const track = document.getElementById('carousel-track');
            if (!track) return;

            const recentBooks = books.slice(0, 6);
            const carouselBooks = [...recentBooks, ...recentBooks];

            track.innerHTML = carouselBooks.map((book) => {
                const coverUrl = controller.getCoverUrl(book, 'medium');
                return `<img class="carousel-book" src="${escapeAttr(coverUrl)}" alt="${escapeAttr(book.title)}" title="${escapeAttr(book.title)} by ${escapeAttr(book.author)}" decoding="async" data-action="carousel-book" data-isbn="${escapeAttr(book.isbn)}" data-remove-on-error="true">`;
            }).join('');
        }

        function scrollToBookByIsbn(isbn) {
            const bookCard = document.querySelector(`[data-isbn="${isbn}"]`);
            if (!bookCard) return;

            window.JGCollectionUI.highlightAndScroll(bookCard, {
                duration: 1000,
                shadow: '0 8px 24px rgba(0,0,0,0.2)'
            });
        }

        function scrollToBookByTitle(bookTitle, event) {
            const bookCards = Array.from(document.querySelectorAll('.book-card'));
            const targetCard = bookCards.find((card) => {
                const titleElement = card.querySelector('.book-title');
                return titleElement?.textContent === bookTitle;
            });

            if (!targetCard) return;

            window.JGCollectionUI.highlightAndScroll(targetCard, {
                activeElement: event?.target?.closest('.book-link'),
                activeSelector: '.book-link'
            });
        }

        function updateBookCount(count, categoryName) {
            const countElement = document.getElementById('book-count');
            const labelElement = document.getElementById('counter-label');

            if (countElement) {
                countElement.textContent = count;
            }

            if (labelElement) {
                labelElement.textContent = categoryName && categoryName !== 'all'
                    ? 'Books in Category'
                    : 'Total Books';
            }
        }

        function updateReReadsFilterDisplay(value) {
            const slider = document.getElementById('timesread-slider');
            const text = document.getElementById('filter-timesread-text');
            const normalizedValue = value === 'all' ? 0 : Number(value);

            if (slider) {
                slider.value = normalizedValue;
            }

            if (text) {
                text.textContent = normalizedValue > 0
                    ? (normalizedValue >= 10 ? '10' : String(normalizedValue))
                    : '';
            }
        }

        function updateStarFilterDisplay(value) {
            const stars = document.querySelectorAll('.filter-star');
            const text = document.getElementById('filter-rating-text');

            stars.forEach((star) => {
                const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
                star.classList.remove('full', 'half');

                if (value === 'all') {
                    return;
                }

                if (starNumber <= Math.floor(value)) {
                    star.classList.add('full');
                } else if (starNumber === Math.ceil(value) && value % 1 === 0.5) {
                    star.classList.add('half');
                }
            });

            if (text) {
                text.textContent = value === 'all' ? '' : `${value}+`;
            }
        }

        function getBooksByCategory() {
            const categories = {};
            controller.getBooks().forEach((book) => {
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
            const sortedCategories = Object.entries(booksByCategory)
                .sort((a, b) => b[1].length - a[1].length);

            container.innerHTML = sortedCategories.map(([category, books]) => {
                const previewBooks = books.slice(0, 8);
                const displayName = categoryDisplayNames[category] || category;
                const bookCovers = previewBooks.map((book) => {
                    const coverUrl = controller.getCoverUrl(book, 'medium');
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
                            <span class="category-card-name">${escapeHTML(displayName)}</span>
                            <span class="category-card-count">${books.length}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

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
            if (sidebar?.classList.contains('collapsed')) {
                booksLayout?.classList.add('sidebar-collapsed');
            }
        }

        function openCategoryModal(category) {
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
                        <h2 class="category-expanded-title">${escapeHTML(displayName)}</h2>
                        <button class="category-expanded-close" data-action="close-category-modal">&times;</button>
                    </div>
                    <div class="category-expanded-books">
                        ${books.map((book) => {
                            const coverUrl = controller.getCoverUrl(book);
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

        function openBookFromGrid(isbn) {
            const book = controller.getBooks().find((entry) => entry.isbn === isbn);
            if (!book) return;
            closeCategoryModal();
            controller.openBookModal(book);
        }

        return {
            closeCategoryModal,
            currentViewMode: () => currentViewMode,
            openBookFromGrid,
            openCategoryModal,
            renderCategoryGrid,
            renderBooks,
            renderCarousel,
            renderSidebar,
            scrollToBookByIsbn,
            scrollToBookByTitle,
            setViewMode,
            updateBookCount,
            updateReReadsFilterDisplay,
            updateStarFilterDisplay
        };
    }

    window.JGBooksView = {
        create
    };
}());
