// sidebar section presets, task-list configs, project/challenge
// rendering — split out from collection-chrome.ts. Rendering helpers live
// in collection-shell.ts. Pages import section constants from this module.

import { renderSidebarHeader, renderListDropdown, renderSearch } from './collection-shell';
import type { CollectionConfig, SectionItem, ListOption } from './collection-shell';
import { escapeAttr as escapeHTML, escapeAttr as escapeHtmlAttr } from './html-escape';

// === Section presets (mirror collection-sections.js) ===

function categorySection({ label, key, iconKey = '', icon, tooltip = label, countId = `count-${key}`, attrs = {}, panelPrefix = '', panelClass = '' }: {
  label: string;
  key: string;
  iconKey?: string;
  icon?: string;
  tooltip?: string;
  countId?: string;
  attrs?: Record<string, string>;
  panelPrefix?: string;
  panelClass?: string;
}): SectionItem {
  return {
    label,
    tooltip,
    countId,
    iconKey,
    icon,
    attrs,
    panelId: panelPrefix ? `${panelPrefix}-${key}` : '',
    panelClass
  };
}

const essaySectionConfigs: Array<[string, string, string]> = [
  ['Philosophy', 'philosophy', 'question'],
  ['Management', 'management', 'bars'],
  ['Technology', 'technology', 'monitor'],
  ['Personal', 'personal', 'user'],
  ['Finance', 'finance', 'dollar'],
  ['Writing', 'writing', 'edit']
];

export const ESSAY_SECTIONS: SectionItem[] = [
  {
    label: 'All Essays',
    tooltip: 'All Essays',
    countId: 'count-all',
    iconKey: 'file',
    attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' }
  },
  ...essaySectionConfigs.map(([label, key, iconKey]) => categorySection({
    label,
    key,
    iconKey,
    attrs: {
      'data-action': 'toggleCategory',
      'data-action-args': key,
      'data-action-eventobj': 'true'
    },
    panelPrefix: 'category',
    panelClass: 'category-essays'
  }))
];

const podcastSectionConfigs: Array<[string, string, string, string, string]> = [
  ['All Podcasts', 'count-all-podcasts', '10', '🎧', 'all'],
  ['Business & Investing', 'count-business', '3', '💼', 'business'],
  ['Science & Ideas', 'count-ideas', '2', '🧠', 'ideas'],
  ['Personal Development', 'count-development', '2', '⚡', 'development'],
  ['Must-Listen Episodes', 'count-episodes', '3', '★', 'episodes']
];

export const PODCAST_SECTIONS: SectionItem[] = podcastSectionConfigs.map(([label, countId, count, icon, category], i) => ({
  label,
  tooltip: label,
  countId,
  count,
  icon,
  attrs: {
    'data-action': 'filterPodcasts',
    'data-action-args': category,
    'data-action-this': 'true',
    'data-podcast-category': category,
    ...(i === 0 ? { class: 'active' } : {})
  }
}));

const movieSectionConfigs: Array<[string, string, string]> = [
  ['Action', 'Action', '💥'],
  ['Comedy', 'Comedy', '😂'],
  ['Drama', 'Drama', '🎭'],
  ['Horror', 'Horror', '👻'],
  ['Sci-Fi', 'Sci-Fi', '🚀'],
  ['Romance', 'Romance', '💕'],
  ['Thriller', 'Thriller', '😱'],
  ['Documentary', 'Documentary', '📹']
];

export const MOVIE_SECTIONS: SectionItem[] = [
  {
    label: 'All Movies',
    tooltip: 'All Movies',
    countId: 'count-all-movies',
    icon: '🎬',
    attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'all', 'data-action-eventobj': 'true', 'data-genre': 'all', class: 'active' }
  },
  ...movieSectionConfigs.map(([label, key, icon]) => categorySection({
    label,
    key: key.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    icon,
    attrs: {
      'data-action': 'toggleMovieGenre',
      'data-action-args': key,
      'data-action-eventobj': 'true',
      'data-genre': key
    },
    panelPrefix: 'genre',
    panelClass: 'genre-movies'
  }))
];

const bookSectionConfigs: Array<[string, string, string, string]> = [
  ['Advertising and Copywriting', 'advertising', 'megaphone', 'Advertising'],
  ['Autobiographies', 'autobiographies', 'user', 'Autobiographies'],
  ['Big Ideas', 'bigideas', 'lightbulb', 'Big Ideas'],
  ['The Great Books', 'greatbooks', 'openBook', 'The Great Books'],
  ['Out of the Box Thinking', 'outofthebox', 'grid', 'Out of the Box'],
  ['Patience and Clear Thinking', 'patience', 'clock', 'Patience'],
  ['Mental Endurance', 'mentalendurance', 'heart', 'Mental Endurance'],
  ['Learning', 'learning', 'graduation', 'Learning'],
  ['Persuasion', 'persuasion', 'target', 'Persuasion'],
  ['Psychology Books', 'psychology', 'brain', 'Psychology'],
  ['Science', 'science', 'flask', 'Science'],
  ['Storytelling', 'storytelling', 'edit', 'Storytelling'],
  ['Strategy and War', 'strategy', 'bolt', 'Strategy'],
  ['Who Am I?', 'whoami', 'question', 'Who Am I?']
];

export const BOOK_SECTIONS: SectionItem[] = [
  {
    label: 'All Books',
    tooltip: 'All Books',
    countId: 'count-all',
    iconKey: 'book',
    attrs: { 'data-category': 'all', class: 'active' }
  },
  ...bookSectionConfigs.map(([label, key, iconKey, tooltip]) => categorySection({
    label,
    key,
    iconKey,
    tooltip,
    attrs: { 'data-category': key },
    panelPrefix: 'category',
    panelClass: 'category-books'
  }))
];

const peopleSectionConfigs: Array<[string, string, string]> = [
  ['Business & Investing', 'business', 'dollar'],
  ['Writers & Thinkers', 'writers', 'edit'],
  ['Science & Technology', 'science', 'globe'],
  ['Creators & Artists', 'creators', 'star']
];

export const PEOPLE_SECTIONS: SectionItem[] = [
  {
    label: 'All People',
    iconKey: 'users',
    countId: 'count-people-all',
    count: '0',
    attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' }
  },
  ...peopleSectionConfigs.map(([label, key, iconKey]) => ({
    label,
    iconKey,
    countId: `count-people-${key}`,
    count: '0',
    attrs: {
      'data-action': 'filterByCategory',
      'data-action-args': key,
      'data-action-eventobj': 'true'
    }
  } as SectionItem))
];

// === Shared "taste list" dropdown (books/movies/podcasts/products/people) ===
function tasteListOptions(active: string, location: string): ListOption[] {
  return [
    { href: 'books.html', label: 'Books', active: active === 'books' },
    { href: 'movies.html', label: 'Movies', active: active === 'movies' },
    { href: 'podcasts.html', label: 'Podcasts', active: active === 'podcasts' },
    {
      href: 'products.html',
      label: 'Products',
      active: active === 'products',
      attrs: { 'data-analytics': 'cta', 'data-cta-id': 'product-recommendations', 'data-cta-location': location }
    },
    { href: 'people.html', label: 'People of History', active: active === 'people' }
  ];
}

// === Task list (projects, challenges) ===

interface CategoryMeta {
  label: string;
  emoji: string;
  placeholder?: string;
}

const PROJECT_CATEGORY_META: Record<string, CategoryMeta> = {
  software: { label: 'Software', emoji: '💻', placeholder: 'placeholder-software' },
  research: { label: 'Research', emoji: '📚', placeholder: 'placeholder-research' },
  ai: { label: 'AI', emoji: '🤖', placeholder: 'placeholder-ai' },
  writing: { label: 'Writing', emoji: '✍️', placeholder: 'placeholder-writing' },
  'real-estate': { label: 'Real Estate', emoji: '🏠', placeholder: 'placeholder-real-estate' },
  finance: { label: 'Finance', emoji: '💰', placeholder: 'placeholder-finance' }
};

const PROJECT_STATUS_META: Record<string, { label: string; emoji: string }> = {
  active: { label: 'Active', emoji: '⚡' },
  completed: { label: 'Completed', emoji: '✅' },
  planned: { label: 'Planned', emoji: '📋' }
};

const CHALLENGE_CATEGORY_META: Record<string, CategoryMeta> = {
  learning: { label: 'Learning', emoji: '📚', placeholder: 'placeholder-learning' },
  fitness: { label: 'Fitness', emoji: '💪', placeholder: 'placeholder-fitness' },
  creative: { label: 'Creative', emoji: '✍️', placeholder: 'placeholder-creative' },
  financial: { label: 'Financial', emoji: '💰', placeholder: 'placeholder-financial' }
};

const CHALLENGE_STATUS_META: Record<string, { label: string; emoji: string }> = {
  active: { label: 'Active', emoji: '⚡' },
  upcoming: { label: 'Upcoming', emoji: '📋' },
  completed: { label: 'Completed', emoji: '✅' }
};

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function projectCategoryMeta(category: string): CategoryMeta {
  const key = (category || '').toLowerCase();
  return PROJECT_CATEGORY_META[key] ?? {
    label: titleCase(category || 'General'),
    emoji: '🛠️',
    placeholder: 'placeholder-software'
  };
}

function challengeCategoryMeta(category: string): CategoryMeta {
  const key = (category || '').toLowerCase();
  return CHALLENGE_CATEGORY_META[key] ?? {
    label: titleCase(category || 'General'),
    emoji: '🎯',
    placeholder: 'placeholder-learning'
  };
}

interface Project {
  id: string;
  slug?: string;
  title: string;
  shortDescription?: string;
  description?: string;
  status?: string;
  category?: string;
  tags?: string[];
  technologies?: string[];
  topics?: string[];
}

interface Challenge {
  id: string;
  slug?: string;
  title: string;
  shortDescription?: string;
  description?: string;
  status?: string;
  category?: string;
  timeframe?: string;
  tags?: string[];
  searchTerms?: string[];
  icon?: string;
  progress?: { label?: string; value?: string; percent?: number | string };
}

export function renderProjectCard(project: Project): string {
  const status = (project.status || 'planned').toLowerCase();
  const category = (project.category || '').toLowerCase();
  const meta = projectCategoryMeta(category);
  const statusLabelText = PROJECT_STATUS_META[status]?.label ?? titleCase(status);
  const description = project.shortDescription || project.description || '';
  const searchTerms = [
    project.title,
    project.shortDescription,
    project.description,
    meta.label,
    statusLabelText,
    ...(project.tags || []),
    ...(project.technologies || []),
    ...(project.topics || [])
  ].filter(Boolean).join(' ');
  const dataCategory = [status, category].filter(Boolean).join(' ');

  return `<div class="movie-card project-card js-zoom-item" data-status="${escapeHtmlAttr(status)}" data-category="${escapeHtmlAttr(dataCategory)}" data-search="${escapeHtmlAttr(searchTerms)}" id="${escapeHtmlAttr(project.slug || project.id)}">
                    <div class="movie-poster-wrapper">
                        <div class="podcast-cover-placeholder ${meta.placeholder ?? ''}">${meta.emoji}</div>
                    </div>
                    <div class="movie-info">
                        <div class="times-read-badge movie-watch-badge status-${escapeHtmlAttr(status)}">${escapeHTML(statusLabelText)}</div>
                        <div class="movie-title-row">
                            <h3 class="movie-title">${escapeHTML(project.title)}</h3>
                        </div>
                        <div class="podcast-category-badge">${escapeHTML(meta.label)}</div>
                        <p class="movie-description">${escapeHTML(description)}</p>
                    </div>
                </div>`;
}

export function renderChallengeCard(challenge: Challenge): string {
  const status = (challenge.status || 'upcoming').toLowerCase();
  const category = (challenge.category || '').toLowerCase();
  const meta = challengeCategoryMeta(category);
  const statusMeta = CHALLENGE_STATUS_META[status] ?? { label: titleCase(status), emoji: '' };
  const description = challenge.shortDescription || challenge.description || '';
  const timeframe = challenge.timeframe || '';
  const categoryLine = [meta.label, timeframe].filter(Boolean).join(' · ');
  const searchTerms = [
    challenge.title,
    challenge.shortDescription,
    challenge.description,
    meta.label,
    statusMeta.label,
    timeframe,
    ...(challenge.tags || []),
    ...(challenge.searchTerms || [])
  ].filter(Boolean).join(' ');
  const dataCategory = [status, category].filter(Boolean).join(' ');
  const progress = challenge.progress;
  const progressHtml = progress
    ? `<div class="challenge-progress">
                            <div class="progress-header">
                                <span class="progress-label">${escapeHTML(progress.label || 'Progress')}</span>
                                <span class="progress-value">${escapeHTML(progress.value || '')}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Number(progress.percent) || 0}%;"></div>
                            </div>
                        </div>`
    : '';

  const icon = challenge.icon || meta.emoji;

  return `<div class="movie-card challenge-card js-zoom-item" data-status="${escapeHtmlAttr(status)}" data-category="${escapeHtmlAttr(dataCategory)}" data-search="${escapeHtmlAttr(searchTerms)}" id="${escapeHtmlAttr(challenge.slug || challenge.id)}">
                    <div class="movie-poster-wrapper">
                        <div class="podcast-cover-placeholder ${meta.placeholder ?? ''}">${icon}</div>
                    </div>
                    <div class="movie-info">
                        <div class="times-read-badge movie-watch-badge status-${escapeHtmlAttr(status)}">${escapeHTML(statusMeta.label)}</div>
                        <div class="movie-title-row">
                            <h3 class="movie-title">${escapeHTML(challenge.title)}</h3>
                        </div>
                        <div class="podcast-category-badge">${escapeHTML(categoryLine)}</div>
                        <p class="movie-description">${escapeHTML(description)}</p>
                        ${progressHtml}
                    </div>
                </div>`;
}

export interface TaskListConfig {
  defaultStatus: string;
  statusOrder: string[];
  statusMeta: Record<string, CategoryMeta>;
  categoryOrder?: string[];
  categoryMap: Record<string, CategoryMeta>;
  categoryFallback: { emoji: string };
  filterAction: string;
  listOptions: ListOption[];
  listCurrentName: string;
  toggleSidebarAction: string;
  toggleListDropdownAction: string;
  layoutId: string;
  sidebarId: string;
  searchInputId: string;
  searchPlaceholder: string;
  searchAction: string;
  searchClearButtonId: string;
  searchClearAction: string;
  allLabel: string;
  allCountId: string;
  sidebarFooter: string;
  headerTitle: string;
  headerSubtitle: string;
  counterId: string;
  counterLabel: string;
  gridId: string;
}

export function renderTaskListMain<T extends Project | Challenge>(
  items: T[],
  cfg: TaskListConfig,
  renderCard: (item: T) => string
): string {
  const total = items.length;
  const statusCounts: Record<string, number> = {};
  for (const status of cfg.statusOrder) statusCounts[status] = 0;
  const categoryCounts = new Map<string, number>();
  for (const item of items) {
    const status = (item.status || cfg.defaultStatus || '').toLowerCase();
    if (statusCounts[status] !== undefined) statusCounts[status] += 1;
    const category = (item.category || '').toLowerCase();
    if (category) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  const renderSidebarButton = (key: string, meta: { label: string; emoji: string }, count: number, countId: string) => `<div class="sidebar-section">
                <button class="sidebar-category" data-action="${escapeHtmlAttr(cfg.filterAction)}" data-action-args="${escapeHtmlAttr(key)}" data-action-this="true" data-tooltip="${escapeHtmlAttr(meta.label)}">
                    <span class="category-icon">${meta.emoji}</span>
                    <span class="category-name">${escapeHTML(meta.label)}</span>
                    <span class="category-count" id="${escapeHtmlAttr(countId)}">${count}</span>
                </button>
            </div>`;

  const statusButtons = cfg.statusOrder
    .map((status) => renderSidebarButton(status, cfg.statusMeta[status], statusCounts[status] || 0, `count-${status}`))
    .join('\n            ');

  const categoryMetaFor = (category: string): CategoryMeta => {
    const key = (category || '').toLowerCase();
    return cfg.categoryMap[key] ?? {
      label: titleCase(category || 'General'),
      emoji: cfg.categoryFallback.emoji
    };
  };

  const categoryKeys = cfg.categoryOrder
    ? cfg.categoryOrder.filter((category) => categoryCounts.has(category))
    : Array.from(categoryCounts.keys()).sort();
  const categoryButtons = categoryKeys
    .map((category) => renderSidebarButton(category, categoryMetaFor(category), categoryCounts.get(category) || 0, `count-cat-${category}`))
    .join('\n            ');

  return `<main class="movies-layout sidebar-collapsed" id="${escapeHtmlAttr(cfg.layoutId)}">
        <aside class="movies-sidebar collapsed" id="${escapeHtmlAttr(cfg.sidebarId)}">
            ${renderSidebarHeader(cfg.toggleSidebarAction)}

            ${renderListDropdown({
              listAction: cfg.toggleListDropdownAction,
              currentListName: cfg.listCurrentName,
              listOptions: cfg.listOptions,
              id: '',
              className: '',
              sections: []
            } as CollectionConfig['sidebar'])}

            ${renderSearch({
              search: {
                inputId: cfg.searchInputId,
                inputClass: 'movie-search-input',
                placeholder: cfg.searchPlaceholder,
                clearButtonId: cfg.searchClearButtonId,
                clearAction: cfg.searchClearAction,
                searchAction: cfg.searchAction,
                searchEvent: 'input',
                searchUsesValue: true
              },
              id: '',
              className: '',
              sections: []
            } as CollectionConfig['sidebar'])}

            <div class="sidebar-section">
                <button class="sidebar-category active" data-action="${escapeHtmlAttr(cfg.filterAction)}" data-action-args="all" data-action-this="true" data-tooltip="${escapeHtmlAttr(cfg.allLabel)}">
                    <span class="category-icon">🎯</span>
                    <span class="category-name">${escapeHTML(cfg.allLabel)}</span>
                    <span class="category-count" id="${escapeHtmlAttr(cfg.allCountId)}">${total}</span>
                </button>
            </div>

            ${statusButtons}${categoryButtons ? `\n\n            ${categoryButtons}` : ''}

            <div class="sidebar-footer">
                <p>${escapeHTML(cfg.sidebarFooter)}</p>
            </div>
        </aside>

        <div class="movies-main">
            <header class="main-header">
                <div class="header-content">
                    <h1>${escapeHTML(cfg.headerTitle)}</h1>
                    <p>${escapeHTML(cfg.headerSubtitle)}</p>
                </div>
                <div class="header-counter">
                    <span class="counter-number" id="${escapeHtmlAttr(cfg.counterId)}">${total}</span>
                    <span class="counter-label">${escapeHTML(cfg.counterLabel)}</span>
                </div>
            </header>

            <div id="${escapeHtmlAttr(cfg.gridId)}" class="movies-grid">
                ${items.map(renderCard).join('\n                ')}
            </div>
        </div>
    </main>`;
}

export const PROJECTS_TASK_CONFIG: TaskListConfig = {
  defaultStatus: 'planned',
  statusOrder: ['active', 'completed', 'planned'],
  statusMeta: PROJECT_STATUS_META,
  categoryMap: PROJECT_CATEGORY_META,
  categoryFallback: { emoji: '🛠️' },
  filterAction: 'filterProjects',
  listOptions: [
    { href: 'projects.html', label: 'Projects', active: true },
    { href: 'challenges.html', label: 'Challenges' },
    { href: 'free-resources.html', label: 'Resources' },
    { href: 'lesson-logger.html', label: 'Lesson Logger' }
  ],
  listCurrentName: 'Projects',
  toggleSidebarAction: 'toggleProjectSidebar',
  toggleListDropdownAction: 'toggleProjectListDropdown',
  layoutId: 'projects-layout',
  sidebarId: 'projects-sidebar',
  searchInputId: 'project-search',
  searchPlaceholder: 'Search projects...',
  searchAction: 'searchProjects',
  searchClearButtonId: 'project-search-clear-btn',
  searchClearAction: 'clearProjectSearch',
  allLabel: 'All Projects',
  allCountId: 'count-all-projects',
  sidebarFooter: 'Things I am building, exploring, and planning',
  headerTitle: 'Projects',
  headerSubtitle: 'Things I am building, exploring, and learning in public.',
  counterId: 'project-count',
  counterLabel: 'Projects',
  gridId: 'projects-container'
};

export const CHALLENGES_TASK_CONFIG: TaskListConfig = {
  defaultStatus: 'upcoming',
  statusOrder: ['active', 'upcoming', 'completed'],
  statusMeta: CHALLENGE_STATUS_META,
  categoryOrder: ['learning', 'fitness', 'creative', 'financial'],
  categoryMap: CHALLENGE_CATEGORY_META,
  categoryFallback: { emoji: '🎯' },
  filterAction: 'filterChallenges',
  listOptions: [
    { href: 'projects.html', label: 'Projects' },
    { href: 'challenges.html', label: 'Challenges', active: true },
    {
      href: 'free-resources.html',
      label: 'Resources',
      attrs: {
        'data-analytics': 'cta',
        'data-cta-id': 'free-resources',
        'data-cta-location': 'challenges'
      }
    },
    { href: 'lesson-logger.html', label: 'Lesson Logger' }
  ],
  listCurrentName: 'Challenges',
  toggleSidebarAction: 'toggleChallengeSidebar',
  toggleListDropdownAction: 'toggleChallengeListDropdown',
  layoutId: 'challenges-layout',
  sidebarId: 'challenges-sidebar',
  searchInputId: 'challenge-search',
  searchPlaceholder: 'Search challenges...',
  searchAction: 'searchChallenges',
  searchClearButtonId: 'challenge-search-clear-btn',
  searchClearAction: 'clearChallengeSearch',
  allLabel: 'All Challenges',
  allCountId: 'count-all-challenges',
  sidebarFooter: 'Personal challenges, constraints, and experiments',
  headerTitle: 'Challenges',
  headerSubtitle: "Personal challenges I'm taking on to grow, learn, and become better. Public accountability helps.",
  counterId: 'challenge-count',
  counterLabel: 'Challenges',
  gridId: 'challenges-container'
};

export const ESSAY_LIST_OPTIONS: ListOption[] = [
  {
    href: 'essays.html',
    label: 'Essays',
    active: true,
    attrs: { 'data-analytics': 'cta', 'data-cta-id': 'best-essays', 'data-cta-location': 'essays' }
  },
  { href: 'books.html', label: 'Books' },
  { href: 'movies.html', label: 'Movies' },
  { href: 'podcasts.html', label: 'Podcasts' }
];

export { tasteListOptions };
