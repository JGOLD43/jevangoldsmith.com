// chrome rendering split out from collection-chrome.ts.
// Pure presenter — emits the shared sidebar/main/search markup as an
// HTML string. Consumed by CollectionPage.astro + TaskCollectionPage.astro.
// Section presets + per-collection data live in collection-sections.ts.

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

export interface SectionItem {
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

export interface ListOption {
  href: string;
  label: string;
  active?: boolean;
  attrs?: Record<string, string>;
}

export interface SearchConfig {
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

export function renderSidebarHeader(collapseAction?: string): string {
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

export function renderListDropdown(sidebar: CollectionConfig['sidebar']): string {
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

export function renderSearch(sidebar: CollectionConfig['sidebar']): string {
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
