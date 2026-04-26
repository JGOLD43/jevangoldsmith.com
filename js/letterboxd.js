// Letterboxd RSS Feed Integration
// Replace 'yourusername' with your actual Letterboxd username
const LETTERBOXD_USERNAME = 'contentwatch';
let allMovies = [];

const movieMetadata = {
    'What Dreams May Come': { genre: 'Drama', timesWatched: 1 },
    'Before Sunset': { genre: 'Romance', timesWatched: 1 },
    'Before Sunrise': { genre: 'Romance', timesWatched: 1 },
    'Lawrence of Arabia': { genre: 'Drama', timesWatched: 2 },
    "Breakfast at Tiffany's": { genre: 'Romance', timesWatched: 2 },
    'The Place Beyond the Pines': { genre: 'Drama', timesWatched: 1 }
};

// Global filter state
let currentStarFilter = 'all';
let currentTimesWatchedFilter = 'all';
let currentMovieSearch = '';

// Get filtered movies based on current filters
function getFilteredMovies() {
    let filtered = allMovies;

    if (currentMovieSearch) {
        const query = currentMovieSearch.toLowerCase();
        filtered = filtered.filter(movie =>
            movie.title.toLowerCase().includes(query) ||
            (movie.genre && movie.genre.toLowerCase().includes(query)) ||
            (movie.year && String(movie.year).includes(query))
        );
    }

    // Apply star filter
    if (currentStarFilter !== 'all') {
        filtered = filtered.filter(movie => movie.starCount >= currentStarFilter);
    }

    // Apply times watched filter
    if (currentTimesWatchedFilter !== 'all') {
        filtered = filtered.filter(movie => movie.timesWatched >= currentTimesWatchedFilter);
    }

    return filtered;
}

function searchMovies(query) {
    currentMovieSearch = query.trim();
    const clearBtn = document.getElementById('movie-search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = currentMovieSearch ? 'flex' : 'none';
    }

    const filteredMovies = getFilteredMovies();
    populateMoviesSidebar(filteredMovies);
    displayMovies(filteredMovies);

    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.genre-movies').forEach(div => {
        div.classList.remove('expanded');
    });
    document.querySelector('[onclick*="toggleMovieGenre(\'all\')"]')?.classList.add('active');
}

function clearMovieSearch() {
    currentMovieSearch = '';
    const searchInput = document.getElementById('movie-search');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('movie-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    const filteredMovies = getFilteredMovies();
    populateMoviesSidebar(filteredMovies);
    displayMovies(filteredMovies);
}

async function fetchLetterboxdMovies() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('movies-container');

    try {
        const cachedMovies = await loadCachedMovies();
        renderMovieCollection(cachedMovies);
        if (!shouldFetchLiveLetterboxd()) return;
    } catch (cacheError) {
        console.warn('Cached movie data unavailable, trying Letterboxd feed:', cacheError);
    }

    try {
        // Letterboxd RSS feed URL
        const rssUrl = `https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`;

        // Use CORS proxy to fetch RSS feed
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch RSS feed');
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Check for parse errors
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('Error parsing RSS feed');
        }

        // Extract items from RSS feed
        const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 20);

        if (items.length === 0) {
            throw new Error('No movies found in feed');
        }

        // Convert XML items to JSON format
        const movieItems = items.map(item => {
            const getElementText = (tagName) => {
                const el = item.querySelector(tagName);
                return el ? el.textContent : '';
            };

            // Extract genre from category tags
            const categories = Array.from(item.querySelectorAll('category')).map(cat => cat.textContent);
            const genre = categories.length > 0 ? categories[0] : 'Uncategorized';

            return {
                title: getElementText('title'),
                link: getElementText('link'),
                pubDate: getElementText('pubDate'),
                description: getElementText('description'),
                genre: genre
            };
        });

        // Hide loading, show container
        loadingEl.style.display = 'none';
        containerEl.style.display = 'grid';

        // Parse movies to structured data
        const movies = movieItems
            .filter(item => item.description && !item.title.includes('created a list'))
            .map(item => parseMovieData(item));
        if (movies.length === 0) {
            throw new Error('No watch entries found in feed');
        }

        renderMovieCollection(movies);

    } catch (error) {
        console.warn('Letterboxd feed unavailable, trying cached movies:', error);
        try {
            const fallbackMovies = await loadCachedMovies();
            renderMovieCollection(fallbackMovies);
        } catch (fallbackError) {
            console.error('Error loading movie data:', fallbackError);
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
        }
    }
}

function shouldFetchLiveLetterboxd() {
    return new URLSearchParams(window.location.search).get('source') === 'live';
}

async function loadCachedMovies() {
    const response = await fetch('data/movies.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load cached movies: ${response.status}`);
    }
    const movies = await response.json();
    if (!Array.isArray(movies) || movies.length === 0) {
        throw new Error('Cached movie data is empty');
    }
    return movies.map(normalizeMovieData);
}

function renderMovieCollection(movies) {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('movies-container');

    allMovies = movies.map(normalizeMovieData);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'grid';

    updateMovieCount(allMovies.length);
    displayMovies(allMovies);
    populateMoviesSidebar(allMovies);
    if (window.MovieStats && typeof window.MovieStats.render === 'function') {
        window.MovieStats.render(allMovies);
    }
}

function formatRuntime(minutes) {
    const m = Number(minutes) || 0;
    if (m <= 0) return '';
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h === 0) return `${rem} min`;
    if (rem === 0) return `${h}h`;
    return `${h}h ${rem}m`;
}

function normalizeMovieData(movie) {
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

function displayMovies(movies) {
    const container = document.getElementById('movies-container');
    container.innerHTML = '';

    movies.forEach(movieData => {
        const movieCard = createMovieCardFromData(movieData);
        container.appendChild(movieCard);
    });
}

function createMovieCardFromData(movieData) {
    const card = document.createElement('div');
    card.className = 'movie-card js-zoom-item';
    card.setAttribute('data-movie-title', movieData.title);
    card.setAttribute('data-title', movieData.title);
    card.setAttribute('data-id', movieData.title);

    // If there's a review, make the card clickable
    if (movieData.review) {
        card.classList.add('has-review');
        card.style.cursor = 'pointer';
    }

    // Generate times watched badge (top right corner)
    let timesWatchedBadge = '';
    if (movieData.timesWatched > 1) {
        timesWatchedBadge = `<div class="times-read-badge movie-watch-badge">${movieData.timesWatched}x Watched</div>`;
    }

    // Genre icon mapping (will use film-related icons)
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


function parseMovieData(item) {
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
        timesWatched: 1 // Default to 1, can be manually updated later
    };

    // Extract rating from title (format: "Movie Title, Year - ★★★★★")
    const ratingMatch = item.title.match(/★+/);
    if (ratingMatch) {
        const stars = ratingMatch[0].length;
        data.starCount = stars;
        data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    }

    // Extract year from title (format: "Movie Title, Year")
    const yearMatch = item.title.match(/,\s*(\d{4})/);
    if (yearMatch) {
        data.year = yearMatch[1];
        // Remove year and rating from title
        data.title = item.title.replace(/,\s*\d{4}.*$/, '').trim();
    }

    // Extract poster image from description
    const posterMatch = item.description.match(/<img[^>]+src="([^"]+)"/);
    if (posterMatch) {
        data.poster = posterMatch[1];
    }

    // Extract review text (remove HTML tags)
    let reviewText = item.description
        .replace(/<img[^>]*>/g, '') // Remove images
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/★+/g, '') // Remove star ratings
        .replace(/Watched on.*$/i, '') // Remove "Watched on" text
        .trim();

    if (reviewText.length > 10) {
        data.review = reviewText;

        // Create short description for card (limit to 150 characters)
        if (reviewText.length > 150) {
            data.shortDescription = reviewText.substring(0, 150) + '...';
        } else {
            data.shortDescription = reviewText;
        }
    }

    const metadata = movieMetadata[data.title] || {};
    data.genre = metadata.genre || item.genre || 'Uncategorized';
    data.timesWatched = metadata.timesWatched || data.timesWatched;

    return data;
}

function openMovieModal(movieData) {
    const modal = document.getElementById('movie-modal');

    // Populate modal content
    document.getElementById('modal-movie-title').textContent = movieData.title;
    document.getElementById('modal-movie-year').textContent = movieData.year || '';
    document.getElementById('modal-movie-rating').textContent = movieData.rating || '';
    document.getElementById('modal-movie-date').textContent = `Watched: ${movieData.date}`;
    document.getElementById('modal-movie-review').textContent = movieData.review || 'No review available.';
    document.getElementById('modal-letterboxd-link').href = movieData.link;

    // Set poster image
    const posterImg = document.getElementById('modal-movie-poster');
    if (movieData.poster) {
        posterImg.src = movieData.poster;
        posterImg.alt = movieData.title;
        posterImg.style.display = 'block';
    } else {
        posterImg.style.display = 'none';
    }

    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeMovieModal() {
    const modal = document.getElementById('movie-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('movie-modal');
    if (event.target === modal) {
        closeMovieModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMovieModal();
    }
});

// Populate sidebar with movie counts and lists
function populateMoviesSidebar(movies = null) {
    const filteredMovies = movies || getFilteredMovies();

    // Hide loading, show content
    const loadingSidebar = document.getElementById('loading-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarFooter = document.getElementById('sidebar-footer');

    if (loadingSidebar) loadingSidebar.style.display = 'none';
    if (sidebarContent) sidebarContent.style.display = 'block';
    if (sidebarFooter) sidebarFooter.style.display = 'block';

    // Group movies by genre
    const genreGroups = {};
    filteredMovies.forEach(movie => {
        const genre = movie.genre || 'Uncategorized';
        if (!genreGroups[genre]) {
            genreGroups[genre] = [];
        }
        genreGroups[genre].push(movie);
    });

    // Update all movies count
    const countAllEl = document.getElementById('count-all-movies');
    if (countAllEl) countAllEl.textContent = filteredMovies.length;

    // Update genre category counts and populate lists
    Object.keys(genreGroups).forEach(genre => {
        const genreKey = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
        const count = genreGroups[genre].length;

        // Update count
        const countEl = document.getElementById(`count-${genreKey}`);
        if (countEl) {
            countEl.textContent = count;
            // Hide category if no movies
            const section = countEl.closest('.sidebar-section');
            if (section) {
                section.style.display = count === 0 ? 'none' : 'block';
            }
        }

        // Populate genre list
        const container = document.getElementById(`genre-${genreKey}`);
        if (container && count > 0) {
            container.innerHTML = genreGroups[genre].map(movie => `
                <a href="#" class="movie-link" onclick="scrollToMovie('${escapeAttr(movie.title)}', event)">
                    <div>${escapeHTML(movie.title)}</div>
                    <div class="movie-link-year">${escapeHTML(movie.year || '')}</div>
                </a>
            `).join('');
        }
    });
}

// Set star filter when clicking a star
function setStarFilter(rating) {
    currentStarFilter = rating;

    // Update star visual states
    updateStarFilterDisplay();

    // Update text display
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) {
        ratingText.textContent = rating >= 5 ? '★' : `${rating}★+`;
    }

    // Re-populate sidebar with filtered movies
    populateMoviesSidebar();

    // Show filtered movies
    displayMovies(getFilteredMovies());

    // Reset genre active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.genre-movies').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Movies"
    document.querySelector('[onclick*="toggleMovieGenre(\'all\')"]')?.classList.add('active');
}

// Clear star filter
function clearStarFilter() {
    currentStarFilter = 'all';

    // Update star visual states
    updateStarFilterDisplay();

    // Clear text display
    const ratingText = document.getElementById('filter-rating-text');
    if (ratingText) {
        ratingText.textContent = '';
    }

    // Re-populate sidebar with all movies
    populateMoviesSidebar();

    // Show all movies
    displayMovies(getFilteredMovies());

    // Reset genre active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.genre-movies').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Movies"
    document.querySelector('[onclick*="toggleMovieGenre(\'all\')"]')?.classList.add('active');
}

// Set times watched filter
function setTimesWatchedFilter(count) {
    currentTimesWatchedFilter = count;

    // Update slider visual states
    updateTimesWatchedFilterDisplay();

    // Update text display
    const timesWatchedText = document.getElementById('filter-timeswatched-text');
    if (timesWatchedText) {
        timesWatchedText.textContent = count >= 10 ? '10' : `${count}`;
    }

    // Re-populate sidebar with filtered movies
    populateMoviesSidebar();

    // Show filtered movies
    displayMovies(getFilteredMovies());

    // Reset genre active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.genre-movies').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Movies"
    document.querySelector('[onclick*="toggleMovieGenre(\'all\')"]')?.classList.add('active');
}

// Clear times watched filter
function clearTimesWatchedFilter() {
    currentTimesWatchedFilter = 'all';

    // Update slider visual states
    updateTimesWatchedFilterDisplay();

    // Clear text display
    const timesWatchedText = document.getElementById('filter-timeswatched-text');
    if (timesWatchedText) {
        timesWatchedText.textContent = '';
    }

    // Re-populate sidebar with all movies
    populateMoviesSidebar();

    // Show all movies
    displayMovies(getFilteredMovies());

    // Reset genre active states
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active', 'expanded');
    });
    document.querySelectorAll('.genre-movies').forEach(div => {
        div.classList.remove('expanded');
    });
    // Activate "All Movies"
    document.querySelector('[onclick*="toggleMovieGenre(\'all\')"]')?.classList.add('active');
}

// Update times watched filter slider visual state
function updateTimesWatchedFilterDisplay() {
    const slider = document.getElementById('timeswatched-slider');
    if (slider) {
        slider.value = currentTimesWatchedFilter === 'all' ? 0 : currentTimesWatchedFilter;
    }
}

// Update the visual state of star filter
function updateStarFilterDisplay() {
    const stars = document.querySelectorAll('.filter-star');
    stars.forEach((star, index) => {
        const starNumber = parseInt(star.getAttribute('data-star'));
        star.classList.remove('full', 'half');

        if (currentStarFilter === 'all') {
            // No stars filled
            return;
        } else if (starNumber <= currentStarFilter) {
            star.classList.add('full');
        } else if (starNumber === currentStarFilter + 0.5) {
            star.classList.add('half');
        }
    });
}

// Toggle genre category expansion
function toggleMovieGenre(genre) {
    const filteredMovies = getFilteredMovies();

    if (genre === 'all') {
        // Show all filtered movies
        displayMovies(filteredMovies);
        // Remove active from all categories
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('active', 'expanded');
        });
        document.querySelectorAll('.genre-movies').forEach(div => {
            div.classList.remove('expanded');
        });
        // Activate "All Movies"
        event.target.closest('.sidebar-category').classList.add('active');
        return;
    }

    const button = event.target.closest('.sidebar-category');
    const genreKey = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
    const container = document.getElementById(`genre-${genreKey}`);

    if (!container) return;

    // Toggle expansion
    const isExpanded = container.classList.contains('expanded');

    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
    } else {
        // Collapse all others
        document.querySelectorAll('.genre-movies').forEach(div => {
            div.classList.remove('expanded');
        });
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('expanded');
        });

        // Expand this one
        container.classList.add('expanded');
        button.classList.add('expanded');

        // Filter movies by genre
        const filtered = filteredMovies.filter(m => m.genre === genre);
        displayMovies(filtered);
    }

    // Update active state
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
}

// Scroll to specific movie
function scrollToMovie(movieTitle, event) {
    if (event) event.preventDefault();

    // Find the movie card by title
    const movieCards = document.querySelectorAll('.movie-card');
    let targetCard = null;

    movieCards.forEach(card => {
        const titleAttr = card.getAttribute('data-movie-title');
        if (titleAttr === movieTitle) {
            targetCard = card;
        }
    });

    if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the movie briefly
        targetCard.style.transform = 'scale(1.05)';
        targetCard.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.3)';
        setTimeout(() => {
            targetCard.style.transform = '';
            targetCard.style.boxShadow = '';
        }, 2000);

        // Update active link
        document.querySelectorAll('.movie-link').forEach(link => {
            link.classList.remove('active');
        });
        if (event && event.target) {
            event.target.closest('.movie-link')?.classList.add('active');
        }
    }
}

// Initialize star filter
function initStarFilter() {
    const stars = document.querySelectorAll('.filter-star');
    if (stars.length === 0) return;

    let isDragging = false;

    // Mouse down on star - start drag
    stars.forEach(star => {
        star.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rating = parseInt(star.getAttribute('data-star'));
            setStarFilter(rating);
        });

        // Mouse enter while dragging
        star.addEventListener('mouseenter', (e) => {
            if (isDragging) {
                const rating = parseInt(star.getAttribute('data-star'));
                setStarFilter(rating);
            }
        });

        // Click on star
        star.addEventListener('click', (e) => {
            const rating = parseInt(star.getAttribute('data-star'));
            setStarFilter(rating);
        });
    });

    // Mouse up anywhere - end drag
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Initialize times watched filter slider
function initTimesWatchedFilter() {
    const slider = document.getElementById('timeswatched-slider');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        if (count === 0) {
            clearTimesWatchedFilter();
        } else {
            setTimesWatchedFilter(count);
        }
    });
}

// Update the movie counter
function updateMovieCount(count) {
    const countElement = document.getElementById('movie-count');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Clear all filters
function clearAllFilters() {
    // Clear search
    currentMovieSearch = '';
    const searchInput = document.getElementById('movie-search');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('movie-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    // Clear star filter
    clearStarFilter();
    // Clear times watched filter
    const slider = document.getElementById('timeswatched-slider');
    if (slider) {
        slider.value = 0;
        setTimesWatchedFilter(0);
    }
    // Clear genre selection
    document.querySelectorAll('.sidebar-category').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.category-movies').forEach(section => section.classList.remove('expanded'));
    // Show all movies
    displayMovies(allMovies);
}

// Toggle sidebar collapse
function toggleSidebar() {
    const layout = document.getElementById('movies-layout');
    const sidebar = document.getElementById('movies-sidebar');
    layout.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed');

    // Save state to localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('movies-sidebar-collapsed', isCollapsed);
}

// Toggle list dropdown
function toggleListDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('list-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

// Load movies when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchLetterboxdMovies();
    initStarFilter();
    initTimesWatchedFilter();
    const moviesGrid = document.getElementById('movies-container');
    if (moviesGrid && window.JGGridZoom) {
        moviesGrid.classList.add('js-zoom-grid');
        window.JGGridZoom.init({
            grid: moviesGrid,
            itemSelector: '.movie-card.has-review',
            triggerSelector: '.movie-card.has-review',
            eventName: 'movie_open'
        });
    }
});
