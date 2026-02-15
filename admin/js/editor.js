// Essay Editor Logic

let currentEssay = null;
let essays = [];
let tinymceEditor = null;

// Initialize TinyMCE
tinymce.init({
    selector: '#essay-content',
    height: 600,
    menubar: false,
    plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | formatselect | bold italic underline | \
        alignleft aligncenter alignright alignjustify | \
        bullist numlist outdent indent | link image media | removeformat | code | help',
    content_style: 'body { font-family: Chivo, sans-serif; font-size: 16px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 20px; }',
    image_title: true,
    automatic_uploads: false,
    file_picker_types: 'image',
    setup: (editor) => {
        tinymceEditor = editor;
    }
});

// Load essays from JSON
async function loadEssays() {
    try {
        const response = await fetch('../data/essays.json');
        if (!response.ok) {
            throw new Error('Failed to load essays');
        }

        const data = await response.json();
        essays = data.essays || [];
        renderEssaysList();
    } catch (error) {
        console.error('Error loading essays:', error);
        essays = [];
        renderEssaysList();
    }
}

// Render essays list
function renderEssaysList(filter = 'all') {
    const container = document.getElementById('essays-list');
    container.innerHTML = '';

    let filteredEssays = essays;
    if (filter === 'published') {
        filteredEssays = essays.filter(e => e.status === 'published');
    } else if (filter === 'draft') {
        filteredEssays = essays.filter(e => e.status === 'draft');
    }

    // Sort by date, newest first
    filteredEssays.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredEssays.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No ${filter === 'all' ? '' : filter} essays found</h3>
                <p>Click "New Essay" to create your first essay.</p>
            </div>
        `;
        return;
    }

    filteredEssays.forEach((essay) => {
        const item = createEssayListItem(essay);
        container.appendChild(item);
    });
}

// Create essay list item
function createEssayListItem(essay) {
    const item = document.createElement('div');
    item.className = 'essay-item';

    const formattedDate = formatDate(essay.date);

    item.innerHTML = `
        <div class="essay-info">
            <h3>${escapeHTML(essay.title)}</h3>
            <div class="essay-meta">
                <span>📅 ${escapeHTML(formattedDate)}</span>
                <span>📂 ${escapeHTML(essay.category)}</span>
                <span class="status-badge ${escapeAttr(essay.status)}">${escapeHTML(essay.status)}</span>
            </div>
        </div>
        <div class="essay-actions">
            <button onclick="editEssay('${escapeAttr(essay.id)}')" class="btn-secondary">Edit</button>
            <button onclick="deleteEssay('${escapeAttr(essay.id)}')" class="btn-danger">Delete</button>
        </div>
    `;

    return item;
}

// New essay
function newEssay() {
    currentEssay = null;
    document.getElementById('essay-form').reset();
    document.getElementById('essay-id').value = '';
    document.getElementById('essay-date').value = new Date().toISOString().split('T')[0];

    if (tinymceEditor) {
        tinymceEditor.setContent('');
    }

    // Clear media gallery
    if (window.mediaManager) {
        window.mediaManager.clearAll();
    }

    showView('essay-editor-view');
}

// Edit essay
function editEssay(essayId) {
    const essay = essays.find(e => e.id === essayId);
    if (!essay) {
        alert('Essay not found');
        return;
    }

    currentEssay = essay;

    document.getElementById('essay-id').value = essay.id;
    document.getElementById('essay-title').value = essay.title;
    document.getElementById('essay-subtitle').value = essay.subtitle || '';
    document.getElementById('essay-category').value = essay.category;
    document.getElementById('essay-date').value = essay.date;

    if (tinymceEditor) {
        tinymceEditor.setContent(essay.content);
    }

    // Clear media gallery for now (can be enhanced to show existing media)
    if (window.mediaManager) {
        window.mediaManager.clearAll();
    }

    showView('essay-editor-view');
}

// Save draft
async function saveDraft() {
    const essayData = getFormData();
    if (!essayData) return;

    essayData.status = 'draft';
    await saveEssay(essayData);
}

// Publish
async function publish() {
    const essayData = getFormData();
    if (!essayData) return;

    if (!confirm('Are you sure you want to publish this essay? It will be visible on your public website.')) {
        return;
    }

    essayData.status = 'published';
    await saveEssay(essayData);
}

// Get form data
function getFormData() {
    const title = document.getElementById('essay-title').value.trim();
    const subtitle = document.getElementById('essay-subtitle').value.trim();
    const category = document.getElementById('essay-category').value;
    const date = document.getElementById('essay-date').value;

    // Validation
    if (!title) {
        alert('Please enter a title');
        document.getElementById('essay-title').focus();
        return null;
    }

    if (!date) {
        alert('Please select a date');
        document.getElementById('essay-date').focus();
        return null;
    }

    if (!tinymceEditor) {
        alert('Editor not initialized');
        return null;
    }

    const content = tinymceEditor.getContent().trim();
    if (!content) {
        alert('Please enter some content');
        return null;
    }

    // Generate ID from title if new essay
    const id = document.getElementById('essay-id').value || generateSlug(title);

    return {
        id: id,
        title: title,
        subtitle: subtitle || null,
        category: category,
        date: date,
        content: content,
        author: 'Jevan Goldsmith',
        featuredImage: null,
        media: [],
        updatedAt: new Date().toISOString(),
        createdAt: currentEssay?.createdAt || new Date().toISOString()
    };
}

// Save essay
async function saveEssay(essayData) {
    // Find existing essay index
    const index = essays.findIndex(e => e.id === essayData.id);

    if (index >= 0) {
        // Update existing
        essays[index] = { ...essays[index], ...essayData };
    } else {
        // Add new
        essays.push(essayData);
    }

    // Generate updated JSON
    const jsonData = {
        essays: essays,
        lastUpdated: new Date().toISOString()
    };

    const jsonString = JSON.stringify(jsonData, null, 2);

    // Download JSON file
    downloadJSON(jsonString, 'essays.json');

    // Show instructions
    const hasMedia = window.mediaManager && window.mediaManager.uploadedFiles.length > 0;
    const mediaInstructions = hasMedia ? getMediaInstructions() : '';

    alert(
        `Essay ${essayData.status === 'published' ? 'published' : 'saved as draft'}!\n\n` +
        `Next steps:\n` +
        `1. Save the downloaded essays.json file to data/essays.json in your repository\n` +
        `${mediaInstructions}` +
        `2. Commit and push changes to GitHub:\n` +
        `   git add -A\n` +
        `   git commit -m "Add essay: ${essayData.title}"\n` +
        `   git push\n\n` +
        `Your changes will be live in 1-2 minutes!`
    );

    // Return to list view
    showView('essay-list-view');
    await loadEssays();
}

// Download JSON file
function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Get media upload instructions
function getMediaInstructions() {
    if (!window.mediaManager || window.mediaManager.uploadedFiles.length === 0) {
        return '';
    }

    const files = window.mediaManager.uploadedFiles;
    let instructions = '\n   Upload these media files to your repository:\n';

    files.forEach(media => {
        const dest = media.type === 'image' ? 'media/images/' : 'media/videos/';
        instructions += `   - ${media.name} → ${dest}${media.name}\n`;
    });

    return instructions;
}

// Delete essay
async function deleteEssay(essayId) {
    const essay = essays.find(e => e.id === essayId);
    if (!essay) return;

    if (!confirm(`Are you sure you want to delete "${essay.title}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    essays = essays.filter(e => e.id !== essayId);

    const jsonData = {
        essays: essays,
        lastUpdated: new Date().toISOString()
    };

    downloadJSON(JSON.stringify(jsonData, null, 2), 'essays.json');

    alert(
        `Essay deleted!\n\n` +
        `Remember to:\n` +
        `1. Replace data/essays.json with the downloaded file\n` +
        `2. Commit and push to GitHub`
    );

    renderEssaysList();
}

// Preview essay
function previewEssay() {
    const essayData = getFormData();
    if (!essayData) return;

    const previewModal = document.getElementById('preview-modal');
    const previewBody = document.getElementById('preview-body');

    previewBody.innerHTML = `
        <article class="article-full">
            <div class="post-meta">
                <span class="post-date">${escapeHTML(formatDate(essayData.date))}</span>
                <span class="post-category">${escapeHTML(essayData.category)}</span>
            </div>
            <h2>${escapeHTML(essayData.title)}</h2>
            ${essayData.subtitle ? `<p><em>${escapeHTML(essayData.subtitle)}</em></p>` : ''}
            ${sanitizeHTML(essayData.content)}
        </article>
    `;

    previewModal.classList.add('show');
}

// Close preview
function closePreview() {
    const previewModal = document.getElementById('preview-modal');
    previewModal.classList.remove('show');
}

// Show/hide views
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// Utility: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Utility: Generate slug from title
function generateSlug(title) {
    return title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadEssays();

    // Navigation buttons
    document.getElementById('new-essay-btn').addEventListener('click', newEssay);
    document.getElementById('back-to-list').addEventListener('click', () => showView('essay-list-view'));
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Editor actions
    document.getElementById('save-draft-btn').addEventListener('click', saveDraft);
    document.getElementById('publish-btn').addEventListener('click', publish);
    document.getElementById('preview-btn').addEventListener('click', previewEssay);

    // Filter tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderEssaysList(tab.dataset.filter);
        });
    });

    // Close preview modal on outside click
    document.getElementById('preview-modal').addEventListener('click', (e) => {
        if (e.target.id === 'preview-modal') {
            closePreview();
        }
    });
});
