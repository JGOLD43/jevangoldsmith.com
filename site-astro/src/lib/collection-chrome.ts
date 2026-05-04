// Build-time renderer for the legacy collection-page chrome (sidebar +
// list-dropdown + search + category buttons + main header). Mirrors
// scripts/legacy-build/build/collection-page.js + collection-sections.js +
// collection-config.js byte-for-byte so collection pages (books, essays,
// movies, people, podcasts) reach parity without per-page rewrites.

const ICON_SVGS: Record<string, string> = {
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  bars: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  bolt: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  brain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 3.5 2 6 4 8l1 4h6l1-4c2-2 4-4.5 4-8a8 8 0 0 0-8-8z"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="8" y1="8" x2="16" y2="8"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  dollar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
  flask: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6v6l3 9H6l3-9V3z"/><line x1="6" y1="21" x2="18" y2="21"/><circle cx="12" cy="15" r="1"/></svg>',
  globe: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  graduation: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  grid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  lightbulb: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
  bag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg>',
  megaphone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  message: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  monitor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  openBook: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  target: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
};

import { escapeAttr as escapeHTML, escapeAttr as escapeHtmlAttr } from './html-escape';

function iconSvg(name: string): string {
  return ICON_SVGS[name] ?? ICON_SVGS.file;
}

interface SectionItem {
  label: string;
  icon?: string;
  iconKey?: string;
  countId?: string;
  count?: string;
  tooltip?: string;
  attrs?: Record<string, string>;
  panelId?: string;
  panelClass?: string;
}

interface ListOption {
  href: string;
  label: string;
  active?: boolean;
  attrs?: Record<string, string>;
}

interface SearchConfig {
  inputId: string;
  inputClass?: string;
  placeholder?: string;
  clearButtonId?: string;
  clearAction?: string;
  searchAction?: string;
  searchUsesValue?: boolean;
  searchEvent?: string;
  wrapperClass?: string;
}

export interface CollectionConfig {
  layout: { id: string; className: string };
  sidebar: {
    id: string;
    className: string;
    collapseAction?: string;
    listAction?: string;
    currentListName?: string;
    listOptions?: ListOption[];
    search?: SearchConfig;
    extraHtml?: string;
    loadingMessage?: string;
    sectionsWrapperId?: string;
    footerText?: string;
    footerId?: string;
    footerHidden?: boolean;
    sections: SectionItem[];
  };
  main: {
    className: string;
    titleTag?: string;
    title: string;
    subtitleHtml?: string;
    subtitleText?: string;
    headerExtraHtml?: string;
    counterExtraHtml?: string;
    counterGroupClass?: string;
    counterId: string;
    counterLabelId?: string;
    counterLabel: string;
    bodyHtml: string;
  };
  afterMainHtml?: string;
}

function renderAttrs(attrs: Record<string, string> = {}, extraClass = ''): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === '' || value == null) continue;
    if (key === 'class') continue;
    entries.push(`${key}="${escapeHtmlAttr(String(value))}"`);
  }
  const className = [attrs.class || '', extraClass].filter(Boolean).join(' ').trim();
  if (className) entries.unshift(`class="${escapeHtmlAttr(className)}"`);
  return entries.length ? ` ${entries.join(' ')}` : '';
}

function renderSidebarHeader(collapseAction?: string): string {
  const actionAttr = collapseAction ? ` data-action="${escapeHtmlAttr(collapseAction)}"` : '';
  return `<div class="sidebar-header">
                <button class="sidebar-collapse-btn"${actionAttr} title="Collapse sidebar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </button>
                <span class="sidebar-browse-label">Browse</span>
            </div>`;
}

function renderListDropdown(sidebar: CollectionConfig['sidebar']): string {
  if (!sidebar.listOptions || sidebar.listOptions.length === 0) return '';
  const actionAttr = sidebar.listAction ? ` data-action="${escapeHtmlAttr(sidebar.listAction)}"` : '';
  const options = sidebar.listOptions.map((item) => {
    const attrs = renderAttrs(item.attrs ?? {}, item.active ? 'list-option active' : 'list-option');
    return `<a href="${escapeHtmlAttr(item.href)}"${attrs}>${escapeHTML(item.label)}</a>`;
  }).join('\n                        ');

  return `<div class="sidebar-list-selector">
                <div class="list-dropdown" id="list-dropdown">
                    <button class="list-dropdown-btn"${actionAttr}>
                        <span id="current-list-name">${escapeHTML(sidebar.currentListName ?? '')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="list-dropdown-menu" id="list-dropdown-menu">
                        ${options}
                    </div>
                </div>
            </div>`;
}

function renderSearch(sidebar: CollectionConfig['sidebar']): string {
  if (!sidebar.search) return '';
  const search = sidebar.search;
  const inputAttrs = renderAttrs({
    id: search.inputId,
    class: search.inputClass ?? '',
    placeholder: search.placeholder ?? '',
    'data-action': search.searchAction ?? '',
    'data-action-event': search.searchEvent ?? '',
    'data-action-value': search.searchUsesValue ? 'true' : ''
  }, '');
  const clearAttrs = renderAttrs({
    id: search.clearButtonId ?? '',
    'data-action': search.clearAction ?? '',
    style: 'display: none;'
  }, 'search-clear-btn');
  const wrapperClass = search.wrapperClass ?? 'search-input-wrapper search-bubble';

  return `<div class="sidebar-search">
                <div class="${escapeHtmlAttr(wrapperClass)}">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text"${inputAttrs}>
                    <button${clearAttrs}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>`;
}

function renderSection(item: SectionItem): string {
  const attrs = renderAttrs(item.attrs ?? {}, 'sidebar-category');
  const iconSource = item.iconKey ? iconSvg(item.iconKey) : (item.icon ?? '');
  const icon = iconSource.trim().startsWith('<') ? iconSource : escapeHTML(iconSource);
  const countIdAttr = item.countId ? ` id="${escapeHtmlAttr(item.countId)}"` : '';
  const panel = item.panelId
    ? `\n                <div class="${escapeHtmlAttr(item.panelClass ?? '')}" id="${escapeHtmlAttr(item.panelId)}"></div>`
    : '';

  return `<div class="sidebar-section">
                <button${attrs}${item.tooltip ? ` data-tooltip="${escapeHtmlAttr(item.tooltip)}"` : ''}>
                    <span class="category-icon"${item.tooltip ? ` title="${escapeHtmlAttr(item.label)}"` : ''}>${icon}</span>
                    <span class="category-name">${escapeHTML(item.label)}</span>
                    <span class="category-count"${countIdAttr}>${escapeHTML(item.count ?? '0')}</span>
                    ${item.panelId ? '<span class="expand-icon">▼</span>' : ''}
                </button>${panel}
            </div>`;
}

export function renderCollectionMain(config: CollectionConfig): string {
  const sectionsHtml = (config.sidebar.sections ?? []).map(renderSection).join('\n\n                ');
  const sectionsWrapped = config.sidebar.sectionsWrapperId
    ? `<div id="${escapeHtmlAttr(config.sidebar.sectionsWrapperId)}" style="display: none;">
                ${sectionsHtml}
            </div>`
    : sectionsHtml;
  const footerHtml = config.sidebar.footerText
    ? `<div class="sidebar-footer"${config.sidebar.footerId ? ` id="${escapeHtmlAttr(config.sidebar.footerId)}"` : ''}${config.sidebar.footerHidden ? ' style="display: none;"' : ''}>
                <p>${escapeHTML(config.sidebar.footerText)}</p>
            </div>`
    : '';
  const subtitleHtml = config.main.subtitleHtml
    ? config.main.subtitleHtml
    : (config.main.subtitleText ? `<p class="header-subtitle">${escapeHTML(config.main.subtitleText)}</p>` : '');
  const counterInnerHtml = `${config.main.counterExtraHtml ?? ''}
                    <div class="header-counter collection-header-counter">
                        <span class="counter-number collection-counter-number" id="${escapeHtmlAttr(config.main.counterId)}">0</span>
                        <span class="counter-label collection-counter-label"${config.main.counterLabelId ? ` id="${escapeHtmlAttr(config.main.counterLabelId)}"` : ''}>${escapeHTML(config.main.counterLabel)}</span>
                    </div>`;
  const renderedCounter = config.main.counterGroupClass
    ? `<div class="${escapeHtmlAttr(config.main.counterGroupClass)}">${counterInnerHtml}</div>`
    : counterInnerHtml;

  return `<main class="${escapeHtmlAttr(config.layout.className)}" id="${escapeHtmlAttr(config.layout.id)}">
        <aside class="${escapeHtmlAttr(config.sidebar.className)}" id="${escapeHtmlAttr(config.sidebar.id)}">
            ${renderSidebarHeader(config.sidebar.collapseAction)}
            ${renderListDropdown(config.sidebar)}
            ${renderSearch(config.sidebar)}
            ${config.sidebar.extraHtml ?? ''}
            ${config.sidebar.loadingMessage ? `<div id="loading-sidebar" class="loading" style="padding: 1rem;"><p style="font-size: 0.85rem;">${escapeHTML(config.sidebar.loadingMessage)}</p></div>` : ''}
            ${sectionsWrapped}
            ${footerHtml}
        </aside>

        <div class="${escapeHtmlAttr(config.main.className)}">
            <header class="main-header collection-header">
                <div class="header-content">
                    <${config.main.titleTag ?? 'h1'}>${escapeHTML(config.main.title)}</${config.main.titleTag ?? 'h1'}>
                    ${subtitleHtml}
                </div>
                ${config.main.headerExtraHtml ?? ''}
                ${renderedCounter}
            </header>
            ${config.main.bodyHtml}
        </div>
        ${config.afterMainHtml ?? ''}
    </main>`;
}

// === Section presets (mirror collection-sections.js) ===

function categorySection({ label, key, iconKey, tooltip = label, countId = `count-${key}`, attrs = {}, panelPrefix = '', panelClass = '' }: {
  label: string;
  key: string;
  iconKey: string;
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
    iconKey: '',
    attrs: {
      'data-action': 'toggleMovieGenre',
      'data-action-args': key,
      'data-action-eventobj': 'true',
      'data-genre': key
    },
    panelPrefix: 'genre',
    panelClass: 'genre-movies'
  })).map((sec, i) => {
    // categorySection sets iconKey, but movies use a literal emoji icon.
    return { ...sec, iconKey: '', icon: movieSectionConfigs[i][2] } as SectionItem;
  })
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
