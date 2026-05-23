import { trapFocus } from '../lib/focus-trap';
import { slugify } from '../lib/slug';
import { categoryDisplayNames, getCoverUrl, state } from './books-state';
import { getBooksByCategory } from './books-render';
import { flyCoverToDetail } from './books-flight';
import { cloneTemplateElement } from './dom-template';

let releaseBookModalFocus: (() => void) | null = null;
let releaseCategoryModalFocus: (() => void) | null = null;

interface BookModalRecord {
    author?: string;
    isbn?: string;
    rating?: number;
    read?: boolean;
    review?: string;
    title?: string;
    year?: string | number;
}

export function openBookModal(book: BookModalRecord) {
    if (!book?.review) return false;
    const modal = document.getElementById('book-modal');
    const modalTitle = document.getElementById('modal-book-title');
    const modalAuthor = document.getElementById('modal-book-author');
    const modalCover = document.getElementById('modal-book-cover') as HTMLImageElement | null;
    const modalRating = document.getElementById('modal-book-rating');
    const modalReview = document.getElementById('modal-book-review');
    if (!modal || !modalTitle || !modalAuthor || !modalCover || !modalRating || !modalReview) return false;
    const isUnread = book.read === false;
    const rating = Number(book.rating) || 0;
    const stars = isUnread ? '' : '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const coverUrl = getCoverUrl(book) || '';
    modalTitle.textContent = book.title || '';
    modalAuthor.textContent = `by ${book.author || ''}${book.year ? ` (${book.year})` : ''}`;
    modalCover.src = coverUrl;
    modalCover.alt = book.title || '';
    modalCover.onerror = () => { modalCover.hidden = true; };
    modalCover.onload = () => { modalCover.hidden = false; };
    // Visual stars stay aria-hidden; an sr-only sibling carries the
    // human-readable rating so screen readers don't announce individual
    // star glyphs.
    modalRating.innerHTML = isUnread
        ? '<span>To Read</span>'
        : `<span aria-hidden="true">${stars}</span><span class="sr-only">${rating} out of 5 stars</span>`;
    modalReview.textContent = book.review || '';
    // ARIA dialog semantics + focus trap. WCAG 2.4.3 + 4.1.2.
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-book-title');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const trigger = document.activeElement as HTMLElement | null;
    releaseBookModalFocus = trapFocus(modal, trigger);
    return true;
}

export function closeBookModal() {
    const modal = document.getElementById('book-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    releaseBookModalFocus?.();
    releaseBookModalFocus = null;
}

export function openCategoryModal(category: string) {
    const books = getBooksByCategory()[category] || [];
    const displayName = categoryDisplayNames[category] || category;
    const modal = document.getElementById('category-expanded-modal');
    const title = document.getElementById('category-expanded-title');
    const list = document.getElementById('category-expanded-books');
    if (!modal || !title || !list) return;
    title.textContent = displayName;
    const fragment = document.createDocumentFragment();
    books.forEach((book: BookModalRecord) => {
        const coverUrl = getCoverUrl(book) || '';
        const item = cloneTemplateElement<HTMLElement>('category-expanded-book-template');
        const image = item?.querySelector('img') as HTMLImageElement | null;
        if (!item || !image) return;
        item.dataset.isbn = book.isbn || '';
        item.setAttribute('aria-label', `${book.title || ''} by ${book.author || ''}`);
        image.src = coverUrl;
        image.alt = book.title || '';
        image.title = `${book.title || ''} by ${book.author || ''}`;
        fragment.appendChild(item);
    });
    list.replaceChildren(fragment);
    // ARIA dialog semantics + focus trap. WCAG 2.4.3 + 4.1.2.
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const trigger = document.activeElement as HTMLElement | null;
    releaseCategoryModalFocus = trapFocus(modal, trigger);
}

export function closeCategoryModal() {
    const modal = document.getElementById('category-expanded-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    releaseCategoryModalFocus?.();
    releaseCategoryModalFocus = null;
}

export function openBookFromGrid(isbn: string, sourceEl?: HTMLElement | null) {
    const book = state.books.find((entry: BookModalRecord) => entry.isbn === isbn);
    if (!book) return;
    // Compute the same detail URL the grid card would use, then fly the
    // clicked cover to the detail page — mirrors the list-view click
    // animation. Fall back to the legacy "open inline review modal" if
    // we can't locate the cover img.
    const slug = book.isbn || slugify(`${book.title || ''}-${book.author || ''}`);
    const href = slug ? `/books/${slug}.html` : '';
    const cover = sourceEl?.querySelector('img') as HTMLImageElement | null;
    if (href && cover) {
        closeCategoryModal();
        flyCoverToDetail(cover, href);
        return;
    }
    closeCategoryModal();
    openBookModal(book);
}
