// Letterboxd RSS Feed Integration
// Replace 'yourusername' with your actual Letterboxd username
const LETTERBOXD_USERNAME = 'contentwatch';

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

        // Parse and display movies
        displayMovies(movieItems);

    } catch (error) {
        console.error('Error fetching Letterboxd data:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

function displayMovies(items) {
    const container = document.getElementById('movies-container');
    container.innerHTML = '';

    // Filter for actual movie reviews/diary entries (not lists)
    const movies = items.filter(item => {
        return item.description && !item.title.includes('created a list');
    });

    movies.forEach(item => {
        const movieCard = createMovieCard(item);
        container.appendChild(movieCard);
    });
}

function createMovieCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // Extract movie details from the item
    const movieData = parseMovieData(item);

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
        year: null,
        poster: null,
        review: null,
        shortDescription: null
    };

    // Extract rating from title (format: "Movie Title, Year - ★★★★★")
    const ratingMatch = item.title.match(/★+/);
    if (ratingMatch) {
        const stars = ratingMatch[0].length;
        data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    }
    console.log('Title:', item.title, 'Rating found:', data.rating);

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

// Load movies when page loads
document.addEventListener('DOMContentLoaded', fetchLetterboxdMovies);