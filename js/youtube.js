// YouTube Channel Integration
const YOUTUBE_CHANNEL_HANDLE = 'JevanGoldsmith';

async function fetchYouTubeVideos() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('videos-container');

    try {
        // YouTube RSS feed for channel
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_HANDLE}`;

        // Use CORS proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch YouTube feed');
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Check for parse errors
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('Error parsing YouTube feed');
        }

        // Extract entries from Atom feed
        const entries = Array.from(xmlDoc.querySelectorAll('entry')).slice(0, 12);

        if (entries.length === 0) {
            throw new Error('No videos found in feed');
        }

        // Convert XML entries to video data
        const videos = entries.map(entry => {
            const getElementText = (tagName, namespace = null) => {
                const el = namespace
                    ? entry.getElementsByTagNameNS(namespace, tagName)[0]
                    : entry.querySelector(tagName);
                return el ? el.textContent : '';
            };

            const videoId = getElementText('videoId', 'http://www.youtube.com/xml/schemas/2015');
            const title = getElementText('title');
            const published = getElementText('published');
            const description = getElementText('description', 'http://search.yahoo.com/mrss/');

            return {
                id: videoId,
                title: title,
                description: description,
                thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                date: new Date(published).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            };
        });

        // Hide loading, show container
        loadingEl.style.display = 'none';
        containerEl.style.display = 'grid';

        // Display videos
        displayVideos(videos);

    } catch (error) {
        console.error('Error fetching YouTube data:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

function displayVideos(videos) {
    const container = document.getElementById('videos-container');
    container.innerHTML = '';

    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        container.appendChild(videoCard);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => window.open(video.url, '_blank');

    card.innerHTML = `
        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" loading="lazy" decoding="async">
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            ${video.description ? `<p class="video-description">${video.description}</p>` : ''}
            <div class="video-meta">
                <span>${video.date}</span>
            </div>
        </div>
    `;

    return card;
}

// Load videos when page loads
document.addEventListener('DOMContentLoaded', fetchYouTubeVideos);
