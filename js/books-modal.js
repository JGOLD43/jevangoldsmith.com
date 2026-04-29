(function () {
    function create({ getCoverUrl }) {
        function close() {
            const modal = document.getElementById('book-modal');
            if (!modal) return;

            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        function open(book) {
            if (!book?.review) return false;

            const modal = document.getElementById('book-modal');
            const modalTitle = document.getElementById('modal-book-title');
            const modalAuthor = document.getElementById('modal-book-author');
            const modalCover = document.getElementById('modal-book-cover');
            const modalRating = document.getElementById('modal-book-rating');
            const modalReview = document.getElementById('modal-book-review');

            if (!modal || !modalTitle || !modalAuthor || !modalCover || !modalRating || !modalReview) {
                return false;
            }

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
            return true;
        }

        return {
            close,
            open
        };
    }

    window.JGBooksModal = {
        create
    };
}());
