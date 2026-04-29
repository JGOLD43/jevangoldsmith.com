(function () {
    function bind({ clearTimesWatchedFilter, closeMovieModal, setStarFilter, setTimesWatchedFilter }) {
        let isDraggingStars = false;

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMovieModal();
            }
        });

        document.addEventListener('click', (event) => {
            const modal = document.getElementById('movie-modal');
            if (event.target === modal) {
                closeMovieModal();
                return;
            }

            window.JGCollectionUI.closeDropdownOnOutsideClick('list-dropdown', event);
        });

        const stars = Array.from(document.querySelectorAll('.filter-star'));
        stars.forEach((star) => {
            star.addEventListener('mousedown', () => {
                isDraggingStars = true;
                setStarFilter(Number.parseInt(star.getAttribute('data-star'), 10));
            });

            star.addEventListener('mouseenter', () => {
                if (!isDraggingStars) return;
                setStarFilter(Number.parseInt(star.getAttribute('data-star'), 10));
            });

            star.addEventListener('click', () => {
                setStarFilter(Number.parseInt(star.getAttribute('data-star'), 10));
            });
        });

        document.addEventListener('mouseup', () => {
            isDraggingStars = false;
        });

        const slider = document.getElementById('timeswatched-slider');
        if (slider) {
            slider.addEventListener('input', (event) => {
                const count = Number.parseInt(event.target.value, 10);
                if (count === 0) {
                    clearTimesWatchedFilter();
                    return;
                }
                setTimesWatchedFilter(count);
            });
        }
    }

    window.JGLetterboxdEvents = {
        bind
    };
}());
