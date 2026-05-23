// Sidebar section presets + task-list configs + project/challenge rendering.
// Section preset DATA lives in data/section-presets.json; this file stays
// focused on building SectionItem shapes from that data and on the
// rendering logic that the JSON can't carry.

import sectionPresets from '../../../data/section-presets.json';
import type { ListOption, SectionItem } from './collection-shell';

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
  categoryMap: Record<string, CategoryMeta>;
  statusMap: Record<string, StatusMeta>;
  fallbackEmoji: string;
  fallbackPlaceholder: string;
  // Per-type extras
  searchExtras?: string[];
  iconOverride?: string;
  categoryLineSuffix?: string;  // challenge appends timeframe
  hrefBuilder?: (record: TaskRecord) => string | null;
}

export interface TaskCardView {
  status: string;
  statusLabel: string;
  dataCategory: string;
  description: string;
  searchTerms: string;
  categoryLine: string;
  icon: string;
  placeholder: string;
  href: string | null;
  imageAlt: string;
}

function taskCardView(record: TaskRecord, opts: TaskCardOpts): TaskCardView {
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
  return {
    status,
    statusLabel: statusEntry.label,
    dataCategory: [status, category].filter(Boolean).join(' '),
    description,
    searchTerms,
    categoryLine: opts.categoryLineSuffix ? [meta.label, opts.categoryLineSuffix].filter(Boolean).join(' · ') : meta.label,
    icon: opts.iconOverride || meta.emoji,
    placeholder: meta.placeholder ?? '',
    href: opts.hrefBuilder ? opts.hrefBuilder(record) : null,
    imageAlt: record.imageAlt || record.title
  };
}

export function projectCardView(project: Project): TaskCardView {
  return taskCardView(project, {
    defaultStatus: 'planned',
    categoryMap: PROJECT_CATEGORY_META,
    statusMap: PROJECT_STATUS_META,
    fallbackEmoji: '🛠️',
    fallbackPlaceholder: 'placeholder-software',
    searchExtras: [...(project.technologies || []), ...(project.topics || [])],
    hrefBuilder: (record) => {
      const slug = record.slug || record.id;
      return slug ? `/projects/${slug}.html` : null;
    }
  });
}

export function challengeCardView(challenge: Challenge): TaskCardView {
  return taskCardView(challenge, {
    defaultStatus: 'upcoming',
    categoryMap: CHALLENGE_CATEGORY_META,
    statusMap: CHALLENGE_STATUS_META,
    fallbackEmoji: '🎯',
    fallbackPlaceholder: 'placeholder-learning',
    searchExtras: [challenge.timeframe || '', ...(challenge.searchTerms || [])],
    categoryLineSuffix: challenge.timeframe || '',
    iconOverride: challenge.icon,
    hrefBuilder: (record) => {
      const slug = record.slug || record.id;
      return slug ? `/challenges/${slug}.html` : null;
    }
  });
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
  headerSubtitleHtml?: string;
  counterId: string;
  counterLabel: string;
  counterGroupClass?: string;
  gridId: string;
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
