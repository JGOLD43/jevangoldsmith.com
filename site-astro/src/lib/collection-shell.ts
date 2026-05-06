// chrome rendering split out from collection-chrome.ts.
// Pure presenter — emits the shared sidebar/main/search markup as an
// HTML string. Consumed by CollectionPage.astro (collection + task modes).
// Section presets + per-collection data live in collection-sections.ts.

// Build-time renderer for the legacy collection-page chrome (sidebar +
// list-dropdown + search + category buttons + main header). Mirrors
// scripts/legacy-build/build/collection-page.js + collection-sections.js +
// collection-config.js byte-for-byte so collection pages (books, essays,
// movies, people, podcasts) reach parity without per-page rewrites.

import { escapeAttr as escapeHTML, escapeAttr as escapeHtmlAttr } from './html-escape';
import { getIcon as iconSvg } from './icons';

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
  /** Optional inner HTML inlined inside the panel div at SSR. Lets pages
   * pre-render per-category lists so JS doesn't paint them in. */
  panelInnerHtml?: string;
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
    ? `\n                <div class="${escapeHtmlAttr(item.panelClass ?? '')}" id="${escapeHtmlAttr(item.panelId)}">${item.panelInnerHtml ?? ''}</div>`
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
