// Letterboxd RSS Feed Integration
// Replace 'yourusername' with your actual Letterboxd username
const LETTERBOXD_USERNAME = 'contentwatch';
let allMovies = [];

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

            return {
                title: getElementText('title'),
                link: getElementText('link'),
                pubDate: getElementText('pubDate'),
                description: getElementText('description')
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

    card.innerHTML = `
        ${movieData.poster ? `<img src="${movieData.poster}" alt="${movieData.title}" class="movie-poster" loading="lazy">` : '<div class="movie-poster" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>'}
        <h3 class="movie-title">${movieData.title}</h3>
        ${movieData.year ? `<p class="movie-year">${movieData.year}</p>` : ''}
        ${movieData.rating ? `<div class="movie-rating">${movieData.rating}</div>` : ''}
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
        shortDescription: null
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
function populateMoviesSidebar(movies) {
    // Hide loading, show content
    const loadingSidebar = document.getElementById('loading-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarFooter = document.getElementById('sidebar-footer');

    loadingSidebar.style.display = 'none';
    sidebarContent.style.display = 'block';
    sidebarFooter.style.display = 'block';

    // Count movies by rating
    const ratingCounts = {
        5: [],
        4: [],
        3: [],
        2: [],
        1: []
    };

    movies.forEach(movie => {
        if (movie.starCount && ratingCounts[movie.starCount]) {
            ratingCounts[movie.starCount].push(movie);
        }
    });

    // Update counts
    document.getElementById('count-all-movies').textContent = movies.length;
    document.getElementById('count-5stars-movies').textContent = ratingCounts[5].length;
    document.getElementById('count-4stars-movies').textContent = ratingCounts[4].length;
    document.getElementById('count-3stars-movies').textContent = ratingCounts[3].length;
    document.getElementById('count-2stars-movies').textContent = ratingCounts[2].length;
    document.getElementById('count-1star-movies').textContent = ratingCounts[1].length;

    // Hide categories with no movies
    [1, 2, 3, 4, 5].forEach(rating => {
        if (ratingCounts[rating].length === 0) {
            const section = document.getElementById(`count-${rating}star${rating === 1 ? '' : 's'}-movies`)?.closest('.sidebar-section');
            if (section) section.style.display = 'none';
        }
    });

    // Populate rating lists
    [5, 4, 3, 2, 1].forEach(rating => {
        const container = document.getElementById(`rating-${rating}star${rating === 1 ? '' : 's'}-movies`);
        if (!container || ratingCounts[rating].length === 0) return;

        container.innerHTML = ratingCounts[rating].map(movie => `
            <a href="#" class="movie-link" onclick="scrollToMovie('${movie.title.replace(/'/g, "\\'")}', event)">
                <div>${movie.title}</div>
                <div class="movie-link-year">${movie.year || ''}</div>
            </a>
        `).join('');
    });
}

// Filter movies by rating
function filterMoviesByRating(rating) {
    // Update active state
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.sidebar-category').classList.add('active');

    // Collapse all categories
    document.querySelectorAll('.category-movies').forEach(div => {
        div.classList.remove('expanded');
    });
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('expanded');
    });

    if (rating === 'all') {
        displayMovies(allMovies);
    } else {
        const filtered = allMovies.filter(movie => movie.starCount === rating);
        displayMovies(filtered);
    }
}

// Toggle rating category expansion
function toggleMovieRating(rating) {
    const button = event.target.closest('.sidebar-category');
    const container = document.getElementById(`rating-${rating}star${rating === 1 ? '' : 's'}-movies`);

    if (!container) return;

    // Toggle expansion
    const isExpanded = container.classList.contains('expanded');

    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
    } else {
        // Collapse all others
        document.querySelectorAll('.category-movies').forEach(div => {
            div.classList.remove('expanded');
        });
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('expanded');
        });

        // Expand this one
        container.classList.add('expanded');
        button.classList.add('expanded');

        // Filter movies by rating
        const filtered = allMovies.filter(movie => movie.starCount === rating);
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

// Load movies when page loads
document.addEventListener('DOMContentLoaded', fetchLetterboxdMovies);