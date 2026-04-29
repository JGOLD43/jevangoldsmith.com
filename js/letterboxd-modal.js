(function () {
    function create() {
        function close() {
            const modal = document.getElementById('movie-modal');
            if (!modal) return;
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        function open(movieData) {
            const modal = document.getElementById('movie-modal');
            if (!modal) return false;

            document.getElementById('modal-movie-title').textContent = movieData.title;
            document.getElementById('modal-movie-year').textContent = movieData.year || '';
            document.getElementById('modal-movie-rating').textContent = movieData.rating || '';
            document.getElementById('modal-movie-date').textContent = `Watched: ${movieData.date}`;
            document.getElementById('modal-movie-review').textContent = movieData.review || 'No review available.';
            document.getElementById('modal-letterboxd-link').href = movieData.link;

            const posterImg = document.getElementById('modal-movie-poster');
            if (movieData.poster) {
                posterImg.src = movieData.poster;
                posterImg.alt = movieData.title;
                posterImg.style.display = 'block';
            } else {
                posterImg.style.display = 'none';
            }

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            return true;
        }

        return {
            close,
            open
        };
    }

    window.JGLetterboxdModal = {
        create
    };
}());
