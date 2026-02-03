// Letterboxd RSS Feed Integration
// Replace 'yourusername' with your actual Letterboxd username
const LETTERBOXD_USERNAME = 'contentwatch';
let allMovies = [];

// Global filter state
let currentStarFilter = 'all';
let currentTimesWatchedFilter = 'all';

// Get filtered movies based on current filters
function getFilteredMovies() {
    let filtered = allMovies;

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

async function fetchLetterboxdMovies() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('movies-container');

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

        allMovies = movies;

        // Update movie count
        updateMovieCount(movies.length);

        // Display movies and populate sidebar
        displayMovies(movies);
        populateMoviesSidebar(movies);

    } catch (error) {
        console.error('Error fetching Letterboxd data:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
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
    card.className = 'movie-card';
    card.setAttribute('data-movie-title', movieData.title);

    // If there's a review, make the card clickable
    if (movieData.review) {
        card.classList.add('has-review');
        card.style.cursor = 'pointer';
        card.onclick = () => openMovieModal(movieData);
    }

    // Generate times watched display
    let timesWatchedHTML = '';
    if (movieData.timesWatched > 1) {
        timesWatchedHTML = `<div class="movie-timeswatched">🎬 ${movieData.timesWatched} Time${movieData.timesWatched === 1 ? '' : 's'} Watched</div>`;
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

    card.innerHTML = `
        ${movieData.poster ? `<img src="${movieData.poster}" alt="${movieData.title}" class="movie-poster" loading="lazy" decoding="async">` : '<div class="movie-poster" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>'}
        <h3 class="movie-title">${movieData.title}</h3>
        ${movieData.year ? `<p class="movie-year">${movieData.year}</p>` : ''}
        ${movieData.rating ? `<div class="movie-rating">${movieData.rating}</div>` : ''}
        ${movieData.genre ? `<div class="movie-genre-badge">${genreIcon} ${movieData.genre}</div>` : ''}
        ${timesWatchedHTML}
        ${movieData.shortDescription ? `<p class="movie-description">${movieData.shortDescription}</p>` : ''}
        <p class="movie-date">Watched: ${movieData.date}</p>
        ${movieData.review ? '<span class="read-review-badge">Click to read review</span>' : ''}
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

    // Set genre from item
    data.genre = item.genre || 'Uncategorized';

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
                <a href="#" class="movie-link" onclick="scrollToMovie('${movie.title.replace(/'/g, "\\'")}', event)">
                    <div>${movie.title}</div>
                    <div class="movie-link-year">${movie.year || ''}</div>
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

// Load movies when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchLetterboxdMovies();
    initStarFilter();
    initTimesWatchedFilter();
});
