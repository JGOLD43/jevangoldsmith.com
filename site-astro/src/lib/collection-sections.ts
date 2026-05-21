// Sidebar section presets + task-list configs + project/challenge rendering.
// Section preset DATA lives in data/section-presets.json; this file stays
// focused on building SectionItem shapes from that data and on the
// rendering logic that the JSON can't carry.

import sectionPresets from '../../../data/section-presets.json';
import type { CollectionConfig, ListOption, SectionItem } from './collection-shell';
import { renderListDropdown, renderSearch, renderSidebarHeader } from './collection-shell';
import { escapeAttr, escapeHtml } from './html-escape';

// === Section presets (data-driven from section-presets.json) ===

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
  return { label, tooltip, countId, iconKey, icon, attrs, panelId: panelPrefix ? `${panelPrefix}-${key}` : '', panelClass };
}

type AllPreset = { label: string; tooltip?: string; countId?: string; iconKey?: string; icon?: string; count?: string };
type CategoryPresetGroup = { all: AllPreset; categories: Array<string[]> };
const presets = sectionPresets as unknown as {
  essay: CategoryPresetGroup;
  podcast: Array<[string, string, string, string, string]>;
  movie: CategoryPresetGroup;
  book: CategoryPresetGroup;
  people: CategoryPresetGroup;
  tasteList: Array<[string, string, string]>;
};

function buildAll(p: AllPreset, attrs: Record<string, string>): SectionItem {
  return { label: p.label, tooltip: p.tooltip ?? p.label, countId: p.countId, iconKey: p.iconKey, icon: p.icon, count: p.count, attrs };
}

export const ESSAY_SECTIONS: SectionItem[] = [
  buildAll(presets.essay.all, { 'data-action': 'toggleCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' }),
  ...presets.essay.categories.map(([label, key, iconKey]) => categorySection({
    label, key, iconKey,
    attrs: { 'data-action': 'toggleCategory', 'data-action-args': key, 'data-action-eventobj': 'true' },
    panelPrefix: 'category', panelClass: 'category-essays'
  }))
];

export const PODCAST_SECTIONS: SectionItem[] = presets.podcast.map(([label, countId, count, icon, category], i) => ({
  label, tooltip: label, countId, count, icon,
  attrs: {
    'data-action': 'filterPodcasts',
    'data-action-args': category,
    'data-action-this': 'true',
    'data-podcast-category': category,
    ...(i === 0 ? { class: 'active' } : {})
  }
}));

export const MOVIE_SECTIONS: SectionItem[] = [
  buildAll(presets.movie.all, { 'data-action': 'toggleMovieGenre', 'data-action-args': 'all', 'data-action-eventobj': 'true', 'data-genre': 'all', class: 'active' }),
  ...presets.movie.categories.map(([label, key, icon]) => categorySection({
    label, key: key.toLowerCase().replace(/[^a-z0-9]+/g, ''), icon,
    attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': key, 'data-action-eventobj': 'true', 'data-genre': key },
    panelPrefix: 'genre', panelClass: 'genre-movies'
  }))
];

export const BOOK_SECTIONS: SectionItem[] = [
  buildAll(presets.book.all, { 'data-category': 'all' }),
  ...presets.book.categories.map(([label, key, iconKey, tooltip]) => categorySection({
    label, key, iconKey, tooltip,
    attrs: { 'data-category': key },
    panelPrefix: 'category', panelClass: 'category-books'
  }))
];

export const PEOPLE_SECTIONS: SectionItem[] = [
  buildAll(presets.people.all, { 'data-action': 'filterByCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' }),
  ...presets.people.categories.map(([label, key, iconKey]) => ({
    label, iconKey,
    countId: `count-people-${key}`, count: '0',
    attrs: { 'data-action': 'filterByCategory', 'data-action-args': key, 'data-action-eventobj': 'true' }
  } as SectionItem))
];

// === Shared "taste list" dropdown (books/movies/podcasts/products/people) ===
function tasteListOptions(active: string): ListOption[] {
  return presets.tasteList.map(([href, label, key]) => ({ href, label, active: active === key }));
}

// === Task list (projects, challenges) ===

interface CategoryMeta { label: string; emoji: string; placeholder?: string }
type StatusMeta = { label: string; emoji: string };

const taskMeta = (sectionPresets as AnyTaskMeta).taskMeta;
const PROJECT_CATEGORY_META = taskMeta.project.categories as Record<string, CategoryMeta>;
const PROJECT_STATUS_META = taskMeta.project.statuses as Record<string, StatusMeta>;
const CHALLENGE_CATEGORY_META = taskMeta.challenge.categories as Record<string, CategoryMeta>;
const CHALLENGE_STATUS_META = taskMeta.challenge.statuses as Record<string, StatusMeta>;

interface AnyTaskMeta {
  taskMeta: {
    project: { categories: Record<string, CategoryMeta>; statuses: Record<string, StatusMeta> };
    challenge: { categories: Record<string, CategoryMeta>; statuses: Record<string, StatusMeta> };
  };
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

const lookupCategoryMeta = (map: Record<string, CategoryMeta>, category: string, fallbackEmoji: string, fallbackPlaceholder: string): CategoryMeta => {
  const key = (category || '').toLowerCase();
  return map[key] ?? { label: titleCase(category || 'General'), emoji: fallbackEmoji, placeholder: fallbackPlaceholder };
};

interface TaskRecord {
  id: string; slug?: string; title: string;
  shortDescription?: string; description?: string;
  status?: string; category?: string; visibility?: string;
  tags?: string[];
  image?: string; imageAlt?: string;
}
export interface Project extends TaskRecord {
  technologies?: string[]; topics?: string[];
}
export interface Challenge extends TaskRecord {
  timeframe?: string; searchTerms?: string[]; icon?: string;
  progress?: { label?: string; value?: string; percent?: number | string };
}

interface TaskCardOpts {
  defaultStatus: string;
  cardClass: string;            // 'project-card' | 'challenge-card'
  categoryMap: Record<string, CategoryMeta>;
  statusMap: Record<string, StatusMeta>;
  fallbackEmoji: string;
  fallbackPlaceholder: string;
  // Per-type extras
  searchExtras?: string[];
  trailingHtml?: string;
  iconOverride?: string;
  categoryLineSuffix?: string;  // challenge appends timeframe
  hrefBuilder?: (record: TaskRecord) => string | null;
}

function renderTaskCard(record: TaskRecord, opts: TaskCardOpts, eager = false): string {
  const status = (record.status || opts.defaultStatus).toLowerCase();
  const category = (record.category || '').toLowerCase();
  const meta = lookupCategoryMeta(opts.categoryMap, category, opts.fallbackEmoji, opts.fallbackPlaceholder);
  const statusEntry = opts.statusMap[status] ?? { label: titleCase(status), emoji: '' };
  const description = record.shortDescription || record.description || '';
  const searchTerms = [
    record.title, record.shortDescription, record.description,
    meta.label, statusEntry.label,
    ...(record.tags || []),
    ...(opts.searchExtras || [])
  ].filter(Boolean).join(' ');
  const dataCategory = [status, category].filter(Boolean).join(' ');
  const icon = opts.iconOverride || meta.emoji;
  const categoryLine = opts.categoryLineSuffix ? [meta.label, opts.categoryLineSuffix].filter(Boolean).join(' · ') : meta.label;
  const href = opts.hrefBuilder ? opts.hrefBuilder(record) : null;
  const tag = href ? 'a' : 'div';
  const hrefAttr = href ? ` href="${escapeAttr(href)}"` : '';
  const wrapperClasses = `movie-card ${opts.cardClass} ${href ? 'card-link' : 'js-zoom-item'}`;

  return `<${tag} class="${wrapperClasses}"${hrefAttr} data-status="${escapeAttr(status)}" data-category="${escapeAttr(dataCategory)}" data-search="${escapeAttr(searchTerms)}" id="${escapeAttr(record.slug || record.id)}">
                    <div class="movie-poster-wrapper">
                        ${record.image
                          ? `<img class="project-cover" src="${escapeAttr(record.image)}" alt="${escapeAttr(record.imageAlt || record.title)}"${eager ? ' fetchpriority="high"' : ''} decoding="async" width="600" height="400">`
                          : `<div class="podcast-cover-placeholder ${meta.placeholder ?? ''}">${icon}</div>`}
                    </div>
                    <div class="movie-info">
                        <div class="times-read-badge movie-watch-badge status-${escapeAttr(status)}">${escapeHtml(statusEntry.label)}</div>
                        <div class="movie-title-row">
                            <h3 class="movie-title">${escapeHtml(record.title)}</h3>
                        </div>
                        <div class="podcast-category-badge">${escapeHtml(categoryLine)}</div>
                        <p class="movie-description">${escapeHtml(description)}</p>${opts.trailingHtml || ''}
                    </div>
                </${tag}>`;
}

export function renderProjectCard(project: Project, eager = false): string {
  return renderTaskCard(project, {
    defaultStatus: 'planned',
    cardClass: 'project-card',
    categoryMap: PROJECT_CATEGORY_META,
    statusMap: PROJECT_STATUS_META,
    fallbackEmoji: '🛠️',
    fallbackPlaceholder: 'placeholder-software',
    searchExtras: [...(project.technologies || []), ...(project.topics || [])],
    hrefBuilder: (record) => {
      const slug = record.slug || record.id;
      return slug ? `/projects/${slug}.html` : null;
    }
  }, eager);
}

export function renderChallengeCard(challenge: Challenge, eager = false): string {
  const progress = challenge.progress;
  const progressHtml = progress
    ? `<div class="challenge-progress">
                            <div class="progress-header">
                                <span class="progress-label">${escapeHtml(progress.label || 'Progress')}</span>
                                <span class="progress-value">${escapeHtml(progress.value || '')}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Number(progress.percent) || 0}%;"></div>
                            </div>
                        </div>`
    : '';
  return renderTaskCard(challenge, {
    defaultStatus: 'upcoming',
    cardClass: 'challenge-card',
    categoryMap: CHALLENGE_CATEGORY_META,
    statusMap: CHALLENGE_STATUS_META,
    fallbackEmoji: '🎯',
    fallbackPlaceholder: 'placeholder-learning',
    searchExtras: [challenge.timeframe || '', ...(challenge.searchTerms || [])],
    categoryLineSuffix: challenge.timeframe || '',
    iconOverride: challenge.icon,
    trailingHtml: `\n                        ${progressHtml}`,
    hrefBuilder: (record) => {
      const slug = record.slug || record.id;
      return slug ? `/challenges/${slug}.html` : null;
    }
  }, eager);
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
  renderCard: (item: T, eager?: boolean) => string
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
                <button class="sidebar-category" data-action="${escapeAttr(cfg.filterAction)}" data-action-args="${escapeAttr(key)}" data-action-this="true" data-tooltip="${escapeAttr(meta.label)}">
                    <span class="category-icon">${meta.emoji}</span>
                    <span class="category-name">${escapeHtml(meta.label)}</span>
                    <span class="category-count" id="${escapeAttr(countId)}">${count}</span>
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

  // The shared .collection-layout / .collection-sidebar classes carry
  // the actual grid layout + sidebar positioning rules. Task lists
  // (projects, challenges) need them just like the people / books pages
  // do; without them the sidebar contents stack at the top of <main>
  // because there's no grid context.
  return `<main class="movies-layout collection-layout sidebar-collapsed" id="${escapeAttr(cfg.layoutId)}">
        <aside class="movies-sidebar collection-sidebar collapsed" id="${escapeAttr(cfg.sidebarId)}">
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
                inputClass: 'movie-search-input collection-search-input',
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
                <button class="sidebar-category active" data-action="${escapeAttr(cfg.filterAction)}" data-action-args="all" data-action-this="true" data-tooltip="${escapeAttr(cfg.allLabel)}">
                    <span class="category-icon">🎯</span>
                    <span class="category-name">${escapeHtml(cfg.allLabel)}</span>
                    <span class="category-count" id="${escapeAttr(cfg.allCountId)}">${total}</span>
                </button>
            </div>

            ${statusButtons}${categoryButtons ? `\n\n            ${categoryButtons}` : ''}

            <div class="sidebar-footer">
                <p>${escapeHtml(cfg.sidebarFooter)}</p>
            </div>
        </aside>

        <div class="movies-main">
            <header class="main-header">
                <div class="header-content">
                    <h2 id="collection-title" data-default-title="${escapeAttr(cfg.headerTitle)}">${escapeHtml(cfg.headerTitle)}</h2>
                    ${cfg.headerSubtitle ? `<p>${escapeHtml(cfg.headerSubtitle)}</p>` : ''}
                </div>
                <div class="header-counter">
                    <span class="counter-number" id="${escapeAttr(cfg.counterId)}">${total}</span>
                    <span class="counter-label">${escapeHtml(cfg.counterLabel)}</span>
                </div>
            </header>

            <div id="${escapeAttr(cfg.gridId)}" class="movies-grid">
                ${items.map((item, i) => renderCard(item, i === 0)).join('\n                ')}
            </div>
        </div>
    </main>`;
}

// Task configs are defined as data in section-presets.json; we only fold in
// the typed metadata maps that can't live in JSON.
type TaskCfgRaw = Omit<TaskListConfig, 'statusMeta' | 'categoryMap' | 'categoryFallback'> & {
  categoryFallbackEmoji: string;
};
const taskCfg = (sectionPresets as { taskConfig: { projects: TaskCfgRaw; challenges: TaskCfgRaw } }).taskConfig;

export const PROJECTS_TASK_CONFIG: TaskListConfig = {
  ...taskCfg.projects,
  statusMeta: PROJECT_STATUS_META,
  categoryMap: PROJECT_CATEGORY_META,
  categoryFallback: { emoji: taskCfg.projects.categoryFallbackEmoji }
};

export const CHALLENGES_TASK_CONFIG: TaskListConfig = {
  ...taskCfg.challenges,
  statusMeta: CHALLENGE_STATUS_META,
  categoryMap: CHALLENGE_CATEGORY_META,
  categoryFallback: { emoji: taskCfg.challenges.categoryFallbackEmoji }
};

export const ESSAY_LIST_OPTIONS: ListOption[] = [
  { href: 'essays.html', label: 'Essays', active: true },
  { href: 'books.html', label: 'Books' },
  { href: 'movies.html', label: 'Movies' },
  { href: 'podcasts.html', label: 'Podcasts' }
];

export { tasteListOptions };

// Sidebar filter sections shared by books + movies (rating + slider).
// Both pages SSR identical-shape HTML; this dedupes the source of truth.
interface RatingFilterOpts {
    clearAction: string;
    preventDefaultOnClear?: boolean;
}

export function renderRatingFilterSection(opts: RatingFilterOpts): string {
    const preventAttr = opts.preventDefaultOnClear ? ' data-action-prevent-default="true"' : '';
    return `<div class="sidebar-filter-section">
    <div class="filter-header">
        <div class="filter-label">Filter by Rating</div>
        <a href="#" class="show-all-link" data-action="${opts.clearAction}"${preventAttr}>Show All</a>
    </div>
    <div class="star-rating-filter">
        <div class="star-filter-container" id="star-filter-container">
            <span class="filter-star" data-star="1">★</span>
            <span class="filter-star" data-star="2">★</span>
            <span class="filter-star" data-star="3">★</span>
            <span class="filter-star" data-star="4">★</span>
            <span class="filter-star" data-star="5">★</span>
            <span class="filter-rating-text" id="filter-rating-text"></span>
        </div>
    </div>
</div>`;
}

interface SliderFilterOpts {
    label: string;
    icon: string;
    /** Filter id namespace, e.g. 'timesread' or 'timeswatched'. */
    id: string;
}

export function renderSliderFilterSection(opts: SliderFilterOpts): string {
    const ticks = '<span class="tick"></span>'.repeat(11);
    return `<div class="sidebar-filter-section">
    <div class="filter-header">
        <div class="filter-label">${opts.label}</div>
    </div>
    <div class="${opts.id}-filter">
        <div class="${opts.id}-filter-container">
            <span class="filter-${opts.id}-icon">${opts.icon}</span>
            <div class="${opts.id}-slider-wrapper">
                <input type="range" min="0" max="10" value="0" class="${opts.id}-slider" id="${opts.id}-slider">
                <div class="${opts.id}-ticks" id="${opts.id}-ticks">
                    ${ticks}
                </div>
            </div>
            <span class="filter-${opts.id}-text" id="filter-${opts.id}-text"></span>
        </div>
    </div>
</div>`;
}
