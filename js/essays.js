// Essay rendering logic
// Loads essays from JSON and renders them dynamically

// Load and render essays
async function loadEssays() {
    try {
        const response = await fetch('data/essays.json');
        if (!response.ok) {
            throw new Error('Failed to load essays');
        }

        const data = await response.json();

        // Only show published essays on public site
        const publishedEssays = data.essays.filter(e => e.status === 'published');

        // Sort by date, newest first
        publishedEssays.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderEssays(publishedEssays);
    } catch (error) {
        console.error('Error loading essays:', error);
        showErrorMessage();
    }
}

// Render essays to the page
function renderEssays(essays) {
    const container = document.getElementById('essays-container');
    if (!container) return;

    container.innerHTML = '';

    if (essays.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">No essays published yet.</p>';
        return;
    }

    essays.forEach((essay) => {
        const article = createEssayArticle(essay);
        container.appendChild(article);
    });
}

// Create an essay article element
function createEssayArticle(essay) {
    const article = document.createElement('article');
    article.className = 'article-full';
    article.id = essay.id;

    const formattedDate = formatDate(essay.date);

    article.innerHTML = `
        <div class="post-meta">
            <span class="post-date">${formattedDate}</span>
            <span class="post-category">${essay.category}</span>
        </div>
        <h2>${essay.title}</h2>
        ${essay.subtitle ? `<p><em>${essay.subtitle}</em></p>` : ''}
        ${essay.content}
    `;

    return article;
}

// Format date to readable string
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Show error message if essays fail to load
function showErrorMessage() {
    const container = document.getElementById('essays-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="color: var(--accent-color); font-size: 1.2rem; margin-bottom: 1rem;">
                Unable to load essays
            </p>
            <p style="color: var(--text-light);">
                Please try refreshing the page.
            </p>
        </div>
    `;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadEssays);
