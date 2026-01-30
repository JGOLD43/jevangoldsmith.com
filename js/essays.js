// Essay rendering logic
// Loads essays from JSON and renders them dynamically

let allEssays = [];

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

        allEssays = publishedEssays;
        renderEssays(publishedEssays);
        populateSidebar(publishedEssays);
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

// Populate sidebar with essay links
function populateSidebar(essays) {
    // Group essays by category
    const categories = {
        philosophy: [],
        management: [],
        technology: [],
        personal: [],
        finance: [],
        writing: []
    };

    essays.forEach(essay => {
        const cat = essay.category.toLowerCase();
        if (categories[cat]) {
            categories[cat].push(essay);
        }
    });

    // Update counts
    document.getElementById('count-all').textContent = essays.length;
    Object.keys(categories).forEach(cat => {
        const count = categories[cat].length;
        const countEl = document.getElementById(`count-${cat}`);
        if (countEl) {
            countEl.textContent = count;
            // Hide category if no essays
            if (count === 0) {
                countEl.closest('.sidebar-section').style.display = 'none';
            }
        }
    });

    // Populate category lists
    Object.keys(categories).forEach(cat => {
        const container = document.getElementById(`category-${cat}`);
        if (!container || categories[cat].length === 0) return;

        container.innerHTML = categories[cat].map(essay => `
            <a href="#${essay.id}" class="essay-link" onclick="scrollToEssay('${essay.id}', event)">
                <div>${essay.title}</div>
                <div class="essay-link-date">${formatDateShort(essay.date)}</div>
            </a>
        `).join('');
    });
}

// Toggle category expansion
function toggleCategory(category) {
    if (category === 'all') {
        // Show all essays
        renderEssays(allEssays);
        // Remove active from all categories
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('active', 'expanded');
        });
        document.querySelectorAll('.category-essays').forEach(div => {
            div.classList.remove('expanded');
        });
        // Activate "All Essays"
        event.target.closest('.sidebar-category').classList.add('active');
        return;
    }

    const button = event.target.closest('.sidebar-category');
    const container = document.getElementById(`category-${category}`);

    if (!container) return;

    // Toggle expansion
    const isExpanded = container.classList.contains('expanded');

    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
    } else {
        // Collapse all others
        document.querySelectorAll('.category-essays').forEach(div => {
            div.classList.remove('expanded');
        });
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.classList.remove('expanded');
        });

        // Expand this one
        container.classList.add('expanded');
        button.classList.add('expanded');

        // Filter essays by category
        const filtered = allEssays.filter(e => e.category.toLowerCase() === category);
        renderEssays(filtered);
    }

    // Update active state
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
}

// Scroll to specific essay
function scrollToEssay(essayId, event) {
    if (event) event.preventDefault();

    const element = document.getElementById(essayId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Highlight the essay briefly
        element.style.background = '#FFF9E6';
        setTimeout(() => {
            element.style.background = '';
        }, 2000);

        // Update active link
        document.querySelectorAll('.essay-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.closest('.essay-link').classList.add('active');
    }
}

// Format date in short form
function formatDateShort(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadEssays);
