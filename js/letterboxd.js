// Letterboxd RSS Feed Integration
// Replace 'yourusername' with your actual Letterboxd username
const LETTERBOXD_USERNAME = 'Contentwatch';
const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json';

async function fetchLetterboxdMovies() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('movies-container');

    try {
        // Letterboxd RSS feed URL
        const rssUrl = `https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`;

        // Use rss2json API to convert RSS to JSON
        const response = await fetch(`${RSS_TO_JSON_API}?rss_url=${encodeURIComponent(rssUrl)}&api_key=&count=20`);

        if (!response.ok) {
            throw new Error('Failed to fetch RSS feed');
        }

        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error('RSS feed returned an error');
        }

        // Hide loading, show container
        loadingEl.style.display = 'none';
        containerEl.style.display = 'grid';

        // Parse and display movies
        displayMovies(data.items);

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

    card.innerHTML = `
        ${movieData.poster ? `<img src="${movieData.poster}" alt="${movieData.title}" class="movie-poster" loading="lazy">` : '<div class="movie-poster" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>'}
        <div class="movie-info">
            <h3 class="movie-title">${movieData.title}</h3>
            ${movieData.year ? `<p class="movie-year">${movieData.year}</p>` : ''}
            ${movieData.rating ? `<div class="movie-rating">${movieData.rating}</div>` : ''}
            ${movieData.review ? `<p class="movie-review">${movieData.review}</p>` : ''}
            <p class="movie-date">Watched: ${movieData.date}</p>
            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="view-letterboxd">View on Letterboxd →</a>
        </div>
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
        review: null
    };

    // Extract year from title (format: "Movie Title, Year")
    const yearMatch = item.title.match(/,\s*(\d{4})/);
    if (yearMatch) {
        data.year = yearMatch[1];
        data.title = item.title.replace(/,\s*\d{4}.*$/, '').trim();
    }

    // Extract rating from description
    const ratingMatch = item.description.match(/★+|Rated\s+([\d.]+)/);
    if (ratingMatch) {
        if (ratingMatch[0].includes('★')) {
            const stars = ratingMatch[0].length;
            data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        } else {
            const rating = parseFloat(ratingMatch[1]);
            const stars = Math.round(rating);
            data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        }
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

    // Limit review length
    if (reviewText.length > 200) {
        reviewText = reviewText.substring(0, 200) + '...';
    }

    if (reviewText.length > 10) {
        data.review = reviewText;
    }

    return data;
}

// Load movies when page loads
document.addEventListener('DOMContentLoaded', fetchLetterboxdMovies);