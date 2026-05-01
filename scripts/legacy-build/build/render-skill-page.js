const { renderDocument } = require('./document');
const { escapeHTML, escapeHtmlAttr } = require('./html-utils');

const SKILL_PROFICIENCY_LEVELS = ['novice', 'beginner', 'intermediate', 'advanced', 'master'];

const SKILL_CATEGORY_PAGES = {
  foundation: 'foundation-skills.html',
  applied: 'applied-skills.html',
  technical: 'technical-skills.html',
  learning: 'learning-skills.html'
};

const SKILL_PAGE_EXTRA_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Chivo:wght@100;300;400;600;700&display=swap" rel="stylesheet">`;

function categoryPageForSkill(skill) {
  return SKILL_CATEGORY_PAGES[skill.category] || 'index.html';
}

function renderProficiencyBar(skill, proficiency) {
  const currentIndex = Math.max(0, SKILL_PROFICIENCY_LEVELS.indexOf(skill.proficiency));
  const bars = Array.from({ length: 5 }, (_, index) => (
    `<div class="proficiency-segment ${index <= currentIndex ? 'filled' : ''}" data-level="${index + 1}"></div>`
  )).join('');
  return `<div class="proficiency-bar">
        <div class="proficiency-segments">${bars}</div>
        <span class="proficiency-label">${escapeHTML(proficiency?.label || skill.proficiency)} (${currentIndex + 1}/5)</span>
    </div>`;
}

function renderActivityBadge(skill, activity) {
  return `<div class="activity-badge activity-${escapeHtmlAttr(skill.activity)}">
        <span class="activity-dot"></span>
        <span class="activity-label">${escapeHTML(activity?.label || skill.activity)}</span>
    </div>`;
}

function createSkillPageRenderer({ skills, site, renderNav, renderFooter }) {
  function renderSkillPage(file, skill) {
    const nav = renderNav(file);
    const footer = renderFooter(file);
    const category = skills.categories?.[skill.category];
    const proficiency = skills.proficiencyLevels?.[skill.proficiency];
    const activity = skills.activityStatuses?.[skill.activity];
    const related = (skill.relatedSkills || [])
      .map((id) => (skills.skills || []).find((candidate) => candidate.id === id && candidate.status !== 'draft'))
      .filter(Boolean);

    const main = `<main class="container">
        <a href="${categoryPageForSkill(skill)}" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to ${escapeHTML(category?.name || 'Skills')}
        </a>

        <div class="skill-detail-hero">
            <span class="category-tag">${escapeHTML(category?.name || skill.category)}</span>
            <h1>${escapeHTML(skill.title)}</h1>
            <p class="skill-detail-tagline">${escapeHTML(skill.tagline)}</p>
            <div class="skill-detail-meta">
                <div class="skill-meta-item">
                    <span class="skill-meta-label">Proficiency</span>
                    ${renderProficiencyBar(skill, proficiency)}
                </div>
                <div class="skill-meta-item">
                    <span class="skill-meta-label">Status</span>
                    ${renderActivityBadge(skill, activity)}
                </div>
            </div>
        </div>

        <div class="skill-detail-content">
            <section class="skill-section">
                ${skill.fullContent || ''}
            </section>

            <section class="skill-section">
                <h2>Why This Matters</h2>
                <p>${escapeHTML(skill.importance)}</p>
            </section>

            <section class="skill-section">
                <h2>How I Apply This</h2>
                <ul>
                    ${(skill.howIApply || []).map((item) => `<li>${escapeHTML(item)}</li>`).join('\n                    ')}
                </ul>
            </section>

            <section class="skill-section">
                <h2>Skill Interactions</h2>
                <p>${escapeHTML(skill.skillInteractions)}</p>
                ${related.length > 0 ? `<div class="related-skills">
                    ${related.map((relatedSkill) => `<a href="skill-${escapeHtmlAttr(relatedSkill.id)}.html" class="related-skill-link">
                        <span class="related-skill-title">${escapeHTML(relatedSkill.title)}</span>
                        <span class="related-skill-tagline">${escapeHTML(relatedSkill.tagline)}</span>
                    </a>`).join('\n                    ')}
                </div>` : ''}
            </section>
        </div>
    </main>`;

    return renderDocument({
      title: `${skill.title} - ${site.siteName}`,
      nav,
      main,
      footer,
      scripts: '<script src="js/theme.js"></script>',
      extraHead: SKILL_PAGE_EXTRA_HEAD
    });
  }

  return { renderSkillPage, categoryPageForSkill };
}

module.exports = {
  createSkillPageRenderer,
  categoryPageForSkill
};
