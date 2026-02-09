// Skills Page JavaScript
// Handles loading skills data and rendering components

let skillsData = null;

// Load skills data from JSON
async function loadSkillsData() {
    if (skillsData) return skillsData;

    try {
        const response = await fetch('data/skills.json');
        skillsData = await response.json();
        return skillsData;
    } catch (error) {
        console.error('Error loading skills data:', error);
        return null;
    }
}

// Get skills by category
function getSkillsByCategory(category) {
    if (!skillsData) return [];
    return skillsData.skills.filter(skill =>
        skill.category === category && skill.status === 'published'
    );
}

// Get skill by ID
function getSkillById(id) {
    if (!skillsData) return null;
    return skillsData.skills.find(skill => skill.id === id);
}

// Get category info
function getCategoryInfo(categoryId) {
    if (!skillsData) return null;
    return skillsData.categories[categoryId];
}

// Get proficiency info
function getProficiencyInfo(level) {
    if (!skillsData) return null;
    return skillsData.proficiencyLevels[level];
}

// Get activity status info
function getActivityInfo(status) {
    if (!skillsData) return null;
    return skillsData.activityStatuses[status];
}

// Render proficiency bar component
function renderProficiencyBar(proficiency) {
    const levels = ['novice', 'beginner', 'intermediate', 'advanced', 'master'];
    const currentIndex = levels.indexOf(proficiency);
    const profInfo = skillsData?.proficiencyLevels[proficiency];

    let barsHtml = '';
    for (let i = 0; i < 5; i++) {
        const filled = i <= currentIndex;
        barsHtml += `<div class="proficiency-segment ${filled ? 'filled' : ''}" data-level="${i + 1}"></div>`;
    }

    return `
        <div class="proficiency-bar">
            <div class="proficiency-segments">${barsHtml}</div>
            <span class="proficiency-label">${profInfo?.label || proficiency} (${currentIndex + 1}/5)</span>
        </div>
    `;
}

// Render activity badge component
function renderActivityBadge(activity) {
    const actInfo = skillsData?.activityStatuses[activity];
    return `
        <div class="activity-badge activity-${activity}">
            <span class="activity-dot"></span>
            <span class="activity-label">${actInfo?.label || activity}</span>
        </div>
    `;
}

// Render skill card for category pages
function renderSkillCard(skill) {
    const categoryInfo = getCategoryInfo(skill.category);

    return `
        <article class="skill-card" data-skill-id="${skill.id}">
            <div class="skill-card-header">
                <span class="skill-card-category">${categoryInfo?.name || skill.category}</span>
                ${renderActivityBadge(skill.activity)}
            </div>
            <h2 class="skill-card-title">${skill.title}</h2>
            <p class="skill-card-tagline">${skill.tagline}</p>
            <div class="skill-card-proficiency">
                ${renderProficiencyBar(skill.proficiency)}
            </div>
            <p class="skill-card-description">${skill.shortDescription}</p>
            <a href="skill-${skill.id}.html" class="skill-card-link">
                Learn More
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </a>
        </article>
    `;
}

// Render category card for hub page
function renderCategoryCard(categoryId, category, skillCount) {
    const icons = {
        layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>',
        wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
        code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
        book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>'
    };

    const pageMap = {
        foundation: 'foundation-skills.html',
        applied: 'applied-skills.html',
        technical: 'technical-skills.html',
        learning: 'learning-skills.html'
    };

    return `
        <a href="${pageMap[categoryId]}" class="category-card" data-category="${categoryId}">
            <div class="category-card-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[category.icon] || icons.layers}
                </svg>
            </div>
            <h3 class="category-card-title">${category.name}</h3>
            <p class="category-card-description">${category.description}</p>
            <div class="category-card-count">${skillCount} skill${skillCount !== 1 ? 's' : ''}</div>
        </a>
    `;
}

// Render related skills section
function renderRelatedSkills(relatedIds) {
    if (!relatedIds || relatedIds.length === 0) return '';

    const relatedSkills = relatedIds
        .map(id => getSkillById(id))
        .filter(skill => skill !== null);

    if (relatedSkills.length === 0) return '';

    const skillLinks = relatedSkills.map(skill => `
        <a href="skill-${skill.id}.html" class="related-skill-link">
            <span class="related-skill-title">${skill.title}</span>
            <span class="related-skill-tagline">${skill.tagline}</span>
        </a>
    `).join('');

    return `
        <div class="related-skills-section">
            <h3>Related Skills</h3>
            <div class="related-skills-grid">
                ${skillLinks}
            </div>
        </div>
    `;
}

// Initialize hub page
async function initHubPage() {
    const data = await loadSkillsData();
    if (!data) return;

    const container = document.getElementById('category-grid');
    if (!container) return;

    let html = '';
    for (const [categoryId, category] of Object.entries(data.categories)) {
        const skills = getSkillsByCategory(categoryId);
        html += renderCategoryCard(categoryId, category, skills.length);
    }

    container.innerHTML = html;

    // Update total count
    const countEl = document.getElementById('total-skill-count');
    if (countEl) {
        const total = data.skills.filter(s => s.status === 'published').length;
        countEl.textContent = total;
    }
}

// Initialize category page
async function initCategoryPage(categoryId) {
    const data = await loadSkillsData();
    if (!data) return;

    const container = document.getElementById('skills-container');
    if (!container) return;

    const skills = getSkillsByCategory(categoryId);

    if (skills.length === 0) {
        container.innerHTML = '<p class="no-skills">No skills in this category yet.</p>';
        return;
    }

    container.innerHTML = skills.map(skill => renderSkillCard(skill)).join('');

    // Update count
    const countEl = document.getElementById('skill-count');
    if (countEl) {
        countEl.textContent = skills.length;
    }

    // Update sidebar counts
    updateSidebarCounts(data);
}

// Update sidebar skill counts
function updateSidebarCounts(data) {
    for (const categoryId of Object.keys(data.categories)) {
        const count = getSkillsByCategory(categoryId).length;
        const countEl = document.querySelector(`[data-category="${categoryId}"] .category-count`);
        if (countEl) {
            countEl.textContent = count;
        }
    }

    // Update all count
    const allCount = data.skills.filter(s => s.status === 'published').length;
    const allCountEl = document.querySelector('[data-category="all"] .category-count');
    if (allCountEl) {
        allCountEl.textContent = allCount;
    }
}

// Initialize skill detail page
async function initSkillDetailPage(skillId) {
    const data = await loadSkillsData();
    if (!data) return;

    const skill = getSkillById(skillId);
    if (!skill) {
        console.error('Skill not found:', skillId);
        return;
    }

    // Update page title
    document.title = `${skill.title} - Jevan Goldsmith`;

    // Update hero
    const heroTitle = document.getElementById('skill-title');
    const heroTagline = document.getElementById('skill-tagline');
    const heroCategory = document.getElementById('skill-category');

    if (heroTitle) heroTitle.textContent = skill.title;
    if (heroTagline) heroTagline.textContent = skill.tagline;
    if (heroCategory) heroCategory.textContent = getCategoryInfo(skill.category)?.name || skill.category;

    // Update metadata
    const proficiencyEl = document.getElementById('skill-proficiency');
    const activityEl = document.getElementById('skill-activity');

    if (proficiencyEl) proficiencyEl.innerHTML = renderProficiencyBar(skill.proficiency);
    if (activityEl) activityEl.innerHTML = renderActivityBadge(skill.activity);

    // Update content
    const contentEl = document.getElementById('skill-content');
    if (contentEl) contentEl.innerHTML = skill.fullContent;

    // Update importance
    const importanceEl = document.getElementById('skill-importance');
    if (importanceEl) importanceEl.innerHTML = `<p>${skill.importance}</p>`;

    // Update how I apply
    const applyEl = document.getElementById('skill-applications');
    if (applyEl && skill.howIApply) {
        applyEl.innerHTML = skill.howIApply.map(item => `
            <div class="application-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span>${item}</span>
            </div>
        `).join('');
    }

    // Update skill interactions
    const interactionsEl = document.getElementById('skill-interactions');
    if (interactionsEl) interactionsEl.innerHTML = `<p>${skill.skillInteractions}</p>`;

    // Update related skills
    const relatedEl = document.getElementById('related-skills');
    if (relatedEl) relatedEl.innerHTML = renderRelatedSkills(skill.relatedSkills);

    // Update back link
    const backLink = document.getElementById('back-link');
    if (backLink) {
        const pageMap = {
            foundation: 'foundation-skills.html',
            applied: 'applied-skills.html',
            technical: 'technical-skills.html',
            learning: 'learning-skills.html'
        };
        backLink.href = pageMap[skill.category] || 'skills.html';
    }
}

// Sidebar toggle for category pages
function toggleSkillsSidebar() {
    const sidebar = document.getElementById('skills-sidebar');
    const layout = document.getElementById('skills-layout');
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (layout) layout.classList.toggle('sidebar-collapsed');
}

// List dropdown toggle
function toggleListDropdown() {
    const menu = document.getElementById('list-dropdown-menu');
    if (menu) menu.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('list-dropdown');
    const menu = document.getElementById('list-dropdown-menu');
    if (dropdown && menu && !dropdown.contains(e.target)) {
        menu.classList.remove('active');
    }
});
