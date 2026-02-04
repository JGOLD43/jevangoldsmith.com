// Essay Importer - Import essays from Markdown files
// Supports drag & drop of .md files with frontmatter

let importedEssays = [];
let existingEssays = [];

// Load existing essays
async function loadExistingEssays() {
    try {
        const response = await fetch('../data/essays.json');
        if (response.ok) {
            const data = await response.json();
            existingEssays = data.essays || [];
        }
    } catch (e) {
        console.log('No existing essays found');
        existingEssays = [];
    }
}

// Initialize on load
loadExistingEssays();

// Toggle essay import panel
function toggleEssayImportPanel() {
    const panel = document.getElementById('essay-import-panel');
    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';

        if (isHidden) {
            clearEssayImport();
        }
    }
}

// Handle file selection
function handleEssayFileSelect(event) {
    const files = event.target.files || event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    importedEssays = [];
    const promises = [];

    for (const file of files) {
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
            promises.push(readMarkdownFile(file));
        }
    }

    if (promises.length === 0) {
        showNotification('Please select Markdown (.md) files', 'error');
        return;
    }

    Promise.all(promises).then(() => {
        if (importedEssays.length > 0) {
            showEssayPreview();
        }
    });
}

// Read and parse a markdown file
function readMarkdownFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const essay = parseMarkdown(content, file.name);
            if (essay) {
                importedEssays.push(essay);
            }
            resolve();
        };
        reader.readAsText(file);
    });
}

// Parse markdown with frontmatter
function parseMarkdown(content, filename) {
    // Check for frontmatter (YAML between --- delimiters)
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    let frontmatter = {};
    let markdownContent = content;

    if (match) {
        frontmatter = parseFrontmatter(match[1]);
        markdownContent = match[2].trim();
    }

    // Generate ID from title or filename
    const title = frontmatter.title || filename.replace(/\.md$/, '').replace(/[-_]/g, ' ');
    const id = generateSlug(title);

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(markdownContent);

    // Build essay object
    const now = new Date().toISOString();

    return {
        id: id,
        title: title,
        subtitle: frontmatter.subtitle || null,
        author: frontmatter.author || 'Jevan Goldsmith',
        date: frontmatter.date || new Date().toISOString().split('T')[0],
        category: frontmatter.category || 'Personal',
        status: frontmatter.status || 'draft',
        content: htmlContent,
        featuredImage: frontmatter.image || frontmatter.featuredImage || null,
        media: [],
        createdAt: now,
        updatedAt: now
    };
}

// Parse YAML frontmatter
function parseFrontmatter(yaml) {
    const result = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            result[key] = value;
        }
    }

    return result;
}

// Generate URL-friendly slug
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
}

// Convert markdown to HTML
function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\_\_\_(.*?)\_\_\_/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');
    html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '\n');

    // Unordered lists
    html = html.replace(/^\s*[-*+] (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)\s*(?=<li>)/g, '$1');
    html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\. (.*$)/gim, '<oli>$1</oli>');
    html = html.replace(/(<oli>.*<\/oli>)\s*(?=<oli>)/g, '$1');
    html = html.replace(/(<oli>[\s\S]*?<\/oli>)(?!\s*<oli>)/g, '<ol>$1</ol>');
    html = html.replace(/<oli>/g, '<li>').replace(/<\/oli>/g, '</li>');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Horizontal rules
    html = html.replace(/^(?:[-*_]){3,}\s*$/gim, '<hr>');

    // Paragraphs - wrap text blocks
    const lines = html.split('\n\n');
    html = lines.map(block => {
        block = block.trim();
        if (!block) return '';
        // Don't wrap if already has block-level element
        if (/^<(h[1-6]|p|ul|ol|li|blockquote|pre|hr|div)/.test(block)) {
            return block;
        }
        // Wrap in paragraph
        return `<p>${block.replace(/\n/g, ' ')}</p>`;
    }).filter(Boolean).join('\n');

    return html;
}

// Show preview of imported essays
function showEssayPreview() {
    const dropzone = document.getElementById('essay-import-dropzone');
    const preview = document.getElementById('essay-import-preview');
    const result = document.getElementById('essay-import-result');
    const countSpan = document.getElementById('essay-preview-count');
    const tbody = document.getElementById('essay-preview-tbody');

    if (!preview || !tbody) return;

    // Hide dropzone, show preview
    if (dropzone) dropzone.style.display = 'none';
    preview.style.display = 'block';
    if (result) result.style.display = 'none';

    // Update count
    countSpan.textContent = importedEssays.length;

    // Populate table
    tbody.innerHTML = importedEssays.map(essay => `
        <tr>
            <td>${escapeHtml(essay.title)}</td>
            <td>${escapeHtml(essay.category)}</td>
            <td>${essay.date}</td>
            <td><span class="status-badge status-${essay.status}">${essay.status}</span></td>
        </tr>
    `).join('');
}

// Escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Clear import
function clearEssayImport() {
    importedEssays = [];

    const dropzone = document.getElementById('essay-import-dropzone');
    const preview = document.getElementById('essay-import-preview');
    const result = document.getElementById('essay-import-result');
    const fileInput = document.getElementById('essay-file-input');

    if (dropzone) dropzone.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (result) result.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

// Apply import - merge essays and generate JSON
function applyEssayImport() {
    if (importedEssays.length === 0) {
        showNotification('No essays to import', 'error');
        return;
    }

    const mergeCheckbox = document.getElementById('merge-essays');
    const shouldMerge = mergeCheckbox ? mergeCheckbox.checked : true;

    let finalEssays;

    if (shouldMerge) {
        // Merge: add new essays, update existing by ID
        const existingMap = new Map(existingEssays.map(e => [e.id, e]));

        for (const essay of importedEssays) {
            if (existingMap.has(essay.id)) {
                // Update existing
                const existing = existingMap.get(essay.id);
                Object.assign(existing, essay, {
                    createdAt: existing.createdAt,
                    updatedAt: new Date().toISOString()
                });
            } else {
                existingMap.set(essay.id, essay);
            }
        }

        finalEssays = Array.from(existingMap.values());
    } else {
        // Replace all
        finalEssays = [...importedEssays];
    }

    // Sort by date, newest first
    finalEssays.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Store for download
    window.generatedEssaysJSON = {
        essays: finalEssays,
        lastUpdated: new Date().toISOString()
    };

    // Show result
    showEssayImportResult(importedEssays.length);
}

// Show import result
function showEssayImportResult(count) {
    const preview = document.getElementById('essay-import-preview');
    const result = document.getElementById('essay-import-result');
    const message = document.getElementById('essay-result-message');

    if (preview) preview.style.display = 'none';
    if (result) result.style.display = 'block';
    if (message) {
        message.textContent = `Successfully processed ${count} essay${count !== 1 ? 's' : ''}.`;
    }
}

// Download essays.json
function downloadEssaysJSON() {
    if (!window.generatedEssaysJSON) {
        showNotification('No essays to download', 'error');
        return;
    }

    const content = JSON.stringify(window.generatedEssaysJSON, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'essays.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('essays.json downloaded!', 'success');
}

// Copy essays JSON to clipboard
function copyEssaysJSON() {
    if (!window.generatedEssaysJSON) {
        showNotification('No essays to copy', 'error');
        return;
    }

    const content = JSON.stringify(window.generatedEssaysJSON, null, 2);

    navigator.clipboard.writeText(content).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

// Download markdown template
function downloadEssayTemplate() {
    const template = `---
title: "Your Essay Title"
subtitle: "An optional subtitle"
author: "Jevan Goldsmith"
date: "${new Date().toISOString().split('T')[0]}"
category: "Philosophy"
status: "draft"
---

# Introduction

Start your essay here. This is the introduction paragraph that sets up your main argument or theme.

## Main Point One

Develop your first main point here. Use **bold** for emphasis and *italics* for subtle emphasis.

You can include:
- Bullet points
- For listing ideas
- In a clear way

## Main Point Two

Continue developing your argument. You can include [links](https://example.com) and quotes:

> "This is a blockquote for citing others or highlighting key thoughts."

### Sub-section

Add more depth with sub-sections when needed.

1. Numbered lists
2. Work great for
3. Sequential steps

## Conclusion

Wrap up your essay with a strong conclusion that ties everything together.

---

*Note: The frontmatter between the --- marks defines the essay metadata. Valid categories are: Philosophy, Management, Technology, Personal, Finance, Writing. Status can be "draft" or "published".*
`;

    const blob = new Blob([template], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'essay-template.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Template downloaded!', 'success');
}

// Setup drag and drop
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('essay-import-dropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleEssayFileSelect(e);
    });
});
