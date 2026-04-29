(function () {
    const genreIcons = {
        'Action': '💥',
        'Adventure': '🗺️',
        'Animation': '🎨',
        'Comedy': '😂',
        'Crime': '🔫',
        'Documentary': '📹',
        'Drama': '🎭',
        'Fantasy': '🧙',
        'Horror': '👻',
        'Mystery': '🔍',
        'Romance': '💕',
        'Sci-Fi': '🚀',
        'Thriller': '😱',
        'Western': '🤠',
        'Uncategorized': '🎬'
    };

    function formatRuntime(minutes) {
        const totalMinutes = Number(minutes) || 0;
        if (totalMinutes <= 0) return '';
        const hours = Math.floor(totalMinutes / 60);
        const remainder = totalMinutes % 60;
        if (hours === 0) return `${remainder} min`;
        if (remainder === 0) return `${hours}h`;
        return `${hours}h ${remainder}m`;
    }

    function normalizeMovieData(movie, movieMetadata) {
        const metadata = movieMetadata[movie.title] || {};
        const starCount = Number(movie.starCount || metadata.starCount || 0);
        return {
            title: movie.title || 'Untitled',
            date: movie.date || '',
            link: movie.link || '#',
            rating: movie.rating || (starCount ? `${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}` : null),
            starCount,
            year: movie.year || null,
            poster: movie.poster || null,
            review: movie.review || null,
            shortDescription: movie.shortDescription || null,
            genre: metadata.genre || movie.genre || 'Uncategorized',
            timesWatched: Number(movie.timesWatched || metadata.timesWatched || 1),
            runtime: Number(movie.runtime || 0),
            tmdbId: movie.tmdbId || null,
            tmdbGenres: Array.isArray(movie.tmdbGenres) ? movie.tmdbGenres : [],
            overview: movie.overview || null,
            backdrop: movie.backdrop || null
        };
    }

    function createMovieCardFromData(movieData) {
        const card = document.createElement('div');
        card.className = 'movie-card js-zoom-item';
        card.setAttribute('data-movie-title', movieData.title);
        card.setAttribute('data-title', movieData.title);
        card.setAttribute('data-id', movieData.title);

        if (movieData.review) {
            card.classList.add('has-review');
            card.style.cursor = 'pointer';
        }

        const timesWatchedBadge = movieData.timesWatched > 1
            ? `<div class="times-read-badge movie-watch-badge">${movieData.timesWatched}x Watched</div>`
            : '';
        const genreIcon = genreIcons[movieData.genre] || '🎬';
        const ratingNumber = movieData.starCount || '';

        const detailHtml = movieData.review ? `
            <div class="js-zoom-detail" aria-hidden="true">
                <p class="zoom-detail-kicker">${escapeHTML(movieData.genre || 'Film')}${movieData.year ? ' · ' + escapeHTML(movieData.year) : ''}</p>
                <p class="zoom-detail-title">${escapeHTML(movieData.title)}</p>
                ${movieData.rating ? `<p class="zoom-detail-lead">${escapeHTML(movieData.rating)}</p>` : ''}
                <p class="zoom-detail-line"><span>Review —</span> ${escapeHTML(movieData.review)}</p>
                ${movieData.date ? `<p class="zoom-detail-line"><span>Watched —</span> ${escapeHTML(movieData.date)}</p>` : ''}
                ${movieData.link && movieData.link !== '#' ? `<a class="zoom-detail-link" href="${escapeAttr(movieData.link)}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
            </div>
        ` : '';

        card.innerHTML = `
            ${timesWatchedBadge}
            <div class="movie-poster-wrapper">
                ${movieData.poster ? `<img src="${escapeAttr(movieData.poster)}" alt="${escapeAttr(movieData.title)}" class="movie-poster" loading="lazy" decoding="async">` : `<div class="movie-poster-placeholder">${escapeHTML(movieData.title)}</div>`}
            </div>
            <div class="movie-info">
                <div class="movie-title-row">
                    <h3 class="movie-title">${escapeHTML(movieData.title)}</h3>
                    ${movieData.year ? `<span class="movie-year">${escapeHTML(movieData.year)}</span>` : ''}
                </div>
                ${movieData.runtime ? `<div class="movie-runtime">${escapeHTML(formatRuntime(movieData.runtime))}</div>` : ''}
                ${movieData.genre ? `<div class="movie-genre-badge">${genreIcon} ${escapeHTML(movieData.genre)}</div>` : ''}
                ${movieData.rating ? `<div class="movie-rating">${ratingNumber ? `<span class="rating-number">${escapeHTML(ratingNumber)}</span>` : ''}${escapeHTML(movieData.rating)}</div>` : ''}
                ${movieData.shortDescription ? `<p class="movie-description">${escapeHTML(movieData.shortDescription)}</p>` : ''}
                ${movieData.date ? `<p class="movie-date">Watched: ${escapeHTML(movieData.date)}</p>` : ''}
            </div>
            ${detailHtml}
        `;

        return card;
    }

    function displayMovies(movies) {
        const container = document.getElementById('movies-container');
        if (!container) return;
        container.innerHTML = '';
        movies.forEach((movieData) => {
            container.appendChild(createMovieCardFromData(movieData));
        });
    }

    function parseMovieData(item, movieMetadata) {
        const data = {
            title: item.title,
            date: new Date(item.pubDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            link: item.link,
            rating: null,
            starCount: 0,
            year: null,
            poster: null,
            review: null,
            shortDescription: null,
            genre: null,
            timesWatched: 1
        };

        const ratingMatch = item.title.match(/★+/);
        if (ratingMatch) {
            const stars = ratingMatch[0].length;
            data.starCount = stars;
            data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        }

        const yearMatch = item.title.match(/,\s*(\d{4})/);
        if (yearMatch) {
            data.year = yearMatch[1];
            data.title = item.title.replace(/,\s*\d{4}.*$/, '').trim();
        }

        const posterMatch = item.description.match(/<img[^>]+src="([^"]+)"/);
        if (posterMatch) {
            data.poster = posterMatch[1];
        }

        const reviewText = item.description
            .replace(/<img[^>]*>/g, '')
            .replace(/<[^>]+>/g, '')
            .replace(/★+/g, '')
            .replace(/Watched on.*$/i, '')
            .trim();

        if (reviewText.length > 10) {
            data.review = reviewText;
            data.shortDescription = reviewText.length > 150
                ? `${reviewText.substring(0, 150)}...`
                : reviewText;
        }

        const metadata = movieMetadata[data.title] || {};
        data.genre = metadata.genre || item.genre || 'Uncategorized';
        data.timesWatched = metadata.timesWatched || data.timesWatched;

        return data;
    }

    window.JGLetterboxdRender = {
        createMovieCardFromData,
        displayMovies,
        formatRuntime,
        normalizeMovieData,
        parseMovieData
    };
}());
