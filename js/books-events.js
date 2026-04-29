(function () {
    function getStarRatingFromEvent(star, event) {
        const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
        const rect = star.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const isLeftHalf = clickX < rect.width / 2;

        return isLeftHalf ? starNumber - 0.5 : starNumber;
    }

    function bind({
        clearSearch,
        clearStarFilter,
        closeBookModal,
        closeCategoryModal,
        handleCategoryToggle,
        openBookFromGrid,
        openCategoryModal,
        scrollToBookByIsbn,
        scrollToBookByTitle,
        searchBooks,
        setReReadsFilter,
        setStarFilter,
        setViewMode,
        toggleListDropdown,
        toggleSidebar
    }) {
        let isDraggingStars = false;

        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLImageElement)) return;

            if (target.dataset.bookCoverFallback === 'true') {
                target.hidden = true;
                target.parentElement?.classList.add('book-cover-missing');
                return;
            }

            if (target.dataset.removeOnError === 'true') {
                target.remove();
            }
        }, true);

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            closeBookModal();
            closeCategoryModal();
        });

        document.addEventListener('click', (event) => {
            const modal = document.getElementById('book-modal');
            if (event.target === modal) {
                closeBookModal();
                return;
            }

            if (event.target.closest('[data-action="close-book-modal"]')) {
                closeBookModal();
                return;
            }

            if (event.target.closest('[data-action="toggle-sidebar"]')) {
                toggleSidebar();
                return;
            }

            if (event.target.closest('[data-action="toggle-list-dropdown"]')) {
                toggleListDropdown();
                return;
            }

            if (event.target.closest('[data-action="clear-search"]')) {
                clearSearch();
                return;
            }

            if (event.target.closest('[data-action="clear-star-filter"]')) {
                event.preventDefault();
                clearStarFilter();
                return;
            }

            const categoryButton = event.target.closest('.sidebar-category[data-category]');
            if (categoryButton) {
                handleCategoryToggle(categoryButton.dataset.category || 'all', categoryButton);
                return;
            }

            const viewToggle = event.target.closest('[data-action="set-view-mode"]');
            if (viewToggle) {
                setViewMode(viewToggle.dataset.mode || 'list');
                return;
            }

            const bookLink = event.target.closest('[data-action="book-link"]');
            if (bookLink) {
                scrollToBookByTitle(bookLink.dataset.bookTitle || '', event);
                return;
            }

            const carouselBook = event.target.closest('[data-action="carousel-book"]');
            if (carouselBook) {
                scrollToBookByIsbn(carouselBook.dataset.isbn || '');
                return;
            }

            const categoryModal = event.target.closest('[data-action="open-category-modal"]');
            if (categoryModal) {
                openCategoryModal(categoryModal.dataset.category || '');
                return;
            }

            if (event.target.closest('[data-action="close-category-modal"]')) {
                closeCategoryModal();
                return;
            }

            const openFromGrid = event.target.closest('[data-action="open-book-from-grid"]');
            if (openFromGrid) {
                openBookFromGrid(openFromGrid.dataset.isbn || '');
            }
        });

        document.addEventListener('click', (event) => {
            window.JGCollectionUI.closeDropdownOnOutsideClick('list-dropdown', event);
        });

        const searchInput = document.getElementById('book-search');
        if (searchInput) {
            const debouncedSearch = window.JGCollectionUI.debounce((value) => searchBooks(value), 120);
            searchInput.addEventListener('input', () => debouncedSearch(searchInput.value));
        }

        const slider = document.getElementById('timesread-slider');
        if (slider) {
            slider.addEventListener('input', (event) => {
                const count = Number.parseInt(event.target.value, 10);
                setReReadsFilter(count);
            });
        }

        const starContainer = document.getElementById('star-filter-container');
        if (!starContainer) return;

        const stars = Array.from(starContainer.querySelectorAll('.filter-star'));
        stars.forEach((star) => {
            star.addEventListener('click', (event) => {
                setStarFilter(getStarRatingFromEvent(star, event));
            });

            star.addEventListener('mousedown', (event) => {
                isDraggingStars = true;
                setStarFilter(getStarRatingFromEvent(star, event));
            });

            star.addEventListener('mouseenter', (event) => {
                if (!isDraggingStars) return;
                setStarFilter(getStarRatingFromEvent(star, event));
            });
        });

        document.addEventListener('mouseup', () => {
            isDraggingStars = false;
        });
    }

    window.JGBooksEvents = {
        bind
    };
}());
