(function () {
    function normalizeGenreKey(genre) {
        return String(genre || 'Uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function filterMovies(movies, state) {
        const query = String(state.searchQuery || '').toLowerCase();

        return movies.filter((movie) => {
            if (query) {
                const matchesQuery = [
                    movie.title,
                    movie.genre || '',
                    movie.year ? String(movie.year) : ''
                ].some((value) => String(value).toLowerCase().includes(query));

                if (!matchesQuery) {
                    return false;
                }
            }

            if (state.starFilter !== 'all' && Number(movie.starCount) < Number(state.starFilter)) {
                return false;
            }

            if (state.timesWatchedFilter !== 'all' && Number(movie.timesWatched) < Number(state.timesWatchedFilter)) {
                return false;
            }

            return true;
        });
    }

    function getMoviesForGenre(movies, genre) {
        if (genre === 'all') {
            return movies;
        }
        return movies.filter((movie) => movie.genre === genre);
    }

    function groupMoviesByGenre(movies) {
        return movies.reduce((groups, movie) => {
            const genre = movie.genre || 'Uncategorized';
            if (!groups[genre]) {
                groups[genre] = [];
            }
            groups[genre].push(movie);
            return groups;
        }, {});
    }

    window.JGLetterboxdFilters = {
        filterMovies,
        getMoviesForGenre,
        groupMoviesByGenre,
        normalizeGenreKey
    };
}());
