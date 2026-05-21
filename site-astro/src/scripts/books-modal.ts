import { escapeAttr, escapeHtml } from '../lib/html-escape';
import { categoryDisplayNames, getCoverUrl, state } from './books-state';
import { getBooksByCategory } from './books-render';

export function openBookModal(book: AnyObj) {
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

export function closeBookModal() {
    const modal = document.getElementById('book-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

export function openCategoryModal(category: string) {
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

export function closeCategoryModal() {
    const modal = document.getElementById('category-expanded-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

export function openBookFromGrid(isbn: string) {
    const book = state.books.find((entry: AnyObj) => entry.isbn === isbn);
    if (!book) return;
    closeCategoryModal();
    openBookModal(book);
}
