(function () {
    function setSidebarLoaded() {
        const loadingSidebar = document.getElementById('loading-sidebar');
        const sidebarContent = document.getElementById('sidebar-content');
        const sidebarFooter = document.getElementById('sidebar-footer');

        if (loadingSidebar) loadingSidebar.style.display = 'none';
        if (sidebarContent) sidebarContent.style.display = 'block';
        if (sidebarFooter) sidebarFooter.style.display = 'block';
    }

    function setMainLoaded() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const containerEl = document.getElementById('movies-container');

        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (containerEl) containerEl.style.display = 'grid';
    }

    function setError() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
    }

    function renderSidebar(genreGroups, filters) {
        setSidebarLoaded();

        const countAllEl = document.getElementById('count-all-movies');
        if (countAllEl) {
            const total = Object.values(genreGroups).reduce((sum, movies) => sum + movies.length, 0);
            countAllEl.textContent = total;
        }

        document.querySelectorAll('#sidebar-content .sidebar-section').forEach((section) => {
            const button = section.querySelector('.sidebar-category[data-genre]');
            const genre = button?.dataset.genre;
            if (!genre || genre === 'all') return;

            const key = filters.normalizeGenreKey(genre);
            const countEl = document.getElementById(`count-${key}`);
            const container = document.getElementById(`genre-${key}`);

            if (countEl) {
                countEl.textContent = '0';
            }

            if (container) {
                container.innerHTML = '';
            }

            section.style.display = 'none';
        });

        Object.keys(genreGroups).forEach((genre) => {
            const key = filters.normalizeGenreKey(genre);
            const movies = genreGroups[genre];
            const countEl = document.getElementById(`count-${key}`);
            const section = countEl?.closest('.sidebar-section');
            const container = document.getElementById(`genre-${key}`);

            if (countEl) {
                countEl.textContent = movies.length;
            }

            if (section) {
                section.style.display = movies.length === 0 ? 'none' : 'block';
            }

            if (container) {
                container.innerHTML = movies.map((movie) => `
                    <a href="#" class="movie-link" data-action="scrollToMovie" data-action-args="${encodeURIComponent(movie.title)}" data-action-eventobj="true">
                        <div>${escapeHTML(movie.title)}</div>
                        <div class="movie-link-year">${escapeHTML(movie.year || '')}</div>
                    </a>
                `).join('');
            }
        });
    }

    function updateMovieCount(count) {
        const countElement = document.getElementById('movie-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    function updateStarFilterDisplay(value) {
        const stars = document.querySelectorAll('.filter-star');
        const text = document.getElementById('filter-rating-text');

        stars.forEach((star) => {
            const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
            star.classList.remove('full', 'half');

            if (value === 'all') return;
            if (starNumber <= value) {
                star.classList.add('full');
            } else if (starNumber === value + 0.5) {
                star.classList.add('half');
            }
        });

        if (text) {
            text.textContent = value === 'all' ? '' : (value >= 5 ? '★' : `${value}★+`);
        }
    }

    function updateTimesWatchedFilterDisplay(value) {
        const slider = document.getElementById('timeswatched-slider');
        const text = document.getElementById('filter-timeswatched-text');
        const normalized = value === 'all' ? 0 : Number(value);

        if (slider) {
            slider.value = normalized;
        }

        if (text) {
            text.textContent = normalized > 0 ? (normalized >= 10 ? '10' : String(normalized)) : '';
        }
    }

    function scrollToMovie(movieTitle, event) {
        const movieCards = Array.from(document.querySelectorAll('.movie-card'));
        const targetCard = movieCards.find((card) => card.getAttribute('data-movie-title') === movieTitle);

        if (!targetCard) return;

        window.JGCollectionUI.highlightAndScroll(targetCard, {
            activeElement: event?.target?.closest('.movie-link'),
            activeSelector: '.movie-link'
        });
    }

    window.JGLetterboxdView = {
        renderSidebar,
        scrollToMovie,
        setError,
        setMainLoaded,
        updateMovieCount,
        updateStarFilterDisplay,
        updateTimesWatchedFilterDisplay
    };
}());
