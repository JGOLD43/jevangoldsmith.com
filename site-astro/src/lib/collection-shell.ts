// chrome rendering split out from collection-chrome.ts.
// Pure presenter — emits the shared sidebar/main/search markup as an
// HTML string. Consumed by CollectionPage.astro (collection + task modes).
// Section presets + per-collection data live in collection-sections.ts.

// Build-time renderer for the legacy collection-page chrome (sidebar +
// list-dropdown + search + category buttons + main header). Mirrors
// scripts/legacy-build/build/collection-page.js + collection-sections.js +
// collection-config.js byte-for-byte so collection pages (books, essays,
// movies, people, podcasts) reach parity without per-page rewrites.

import { escapeAttr, escapeHtml } from './html-escape';
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
    /** Label for the second tab in the mobile list/grid toggle. Defaults
     * to `main.title`. Keep short — surfaces on phones only. */
    mobileGridLabel?: string;
  };
  afterMainHtml?: string;
}

function renderAttrs(attrs: Record<string, string> = {}, extraClass = ''): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === '' || value == null) continue;
    if (key === 'class') continue;
    entries.push(`${key}="${escapeAttr(String(value))}"`);
  }
  const className = [attrs.class || '', extraClass].filter(Boolean).join(' ').trim();
  if (className) entries.unshift(`class="${escapeAttr(className)}"`);
  return entries.length ? ` ${entries.join(' ')}` : '';
}

export function renderSidebarHeader(collapseAction?: string): string {
  const actionAttr = collapseAction ? ` data-action="${escapeAttr(collapseAction)}"` : '';
  return `<div class="sidebar-header">
                <button class="sidebar-collapse-btn"${actionAttr} title="Collapse sidebar">
                    <svg class="ico-stroke ico-18" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-sidebarCollapse"/></svg>
                </button>
                <span class="sidebar-browse-label">Browse</span>
            </div>`;
}

export function renderListDropdown(sidebar: CollectionConfig['sidebar']): string {
  if (!sidebar.listOptions || sidebar.listOptions.length === 0) return '';
  const actionAttr = sidebar.listAction ? ` data-action="${escapeAttr(sidebar.listAction)}"` : '';
  const options = sidebar.listOptions.map((item) => {
    const attrs = renderAttrs(item.attrs ?? {}, item.active ? 'list-option active' : 'list-option');
    return `<a href="${escapeAttr(item.href)}"${attrs}>${escapeHtml(item.label)}</a>`;
  }).join('\n                        ');

  return `<div class="sidebar-list-selector">
                <div class="list-dropdown" id="list-dropdown">
                    <button class="list-dropdown-btn"${actionAttr}>
                        <span id="current-list-name">${escapeHtml(sidebar.currentListName ?? '')}</span>
                        <svg class="ico-stroke ico-12" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-chevronDown"/></svg>
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
                <div class="${escapeAttr(wrapperClass)}">
                    <svg class="search-icon ico-stroke ico-18" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-search"/></svg>
                    <input type="text"${inputAttrs}>
                    <button${clearAttrs}>
                        <svg class="ico-stroke ico-14" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-close"/></svg>
                    </button>
                </div>
            </div>`;
}

function renderSection(item: SectionItem): string {
  const attrs = renderAttrs(item.attrs ?? {}, 'sidebar-category');
  const iconSource = item.iconKey ? iconSvg(item.iconKey) : (item.icon ?? '');
  const icon = iconSource.trim().startsWith('<') ? iconSource : escapeHtml(iconSource);
  const countIdAttr = item.countId ? ` id="${escapeAttr(item.countId)}"` : '';
  const panel = item.panelId
    ? `\n                <div class="${escapeAttr(item.panelClass ?? '')}" id="${escapeAttr(item.panelId)}">${item.panelInnerHtml ?? ''}</div>`
    : '';

  return `<div class="sidebar-section">
                <button${attrs}${item.tooltip ? ` data-tooltip="${escapeAttr(item.tooltip)}"` : ''}>
                    <span class="category-icon"${item.tooltip ? ` title="${escapeAttr(item.label)}"` : ''}>${icon}</span>
                    <span class="category-name">${escapeHtml(item.label)}</span>
                    <span class="category-count"${countIdAttr}>${escapeHtml(item.count ?? '0')}</span>
                    ${item.panelId ? '<span class="expand-icon">▼</span>' : ''}
                </button>${panel}
            </div>`;
}

export function renderCollectionMain(config: CollectionConfig): string {
  const sectionsHtml = (config.sidebar.sections ?? []).map(renderSection).join('\n\n                ');
  const sectionsWrapped = config.sidebar.sectionsWrapperId
    ? `<div id="${escapeAttr(config.sidebar.sectionsWrapperId)}" style="display: none;">
                ${sectionsHtml}
            </div>`
    : sectionsHtml;
  const footerHtml = config.sidebar.footerText
    ? `<div class="sidebar-footer"${config.sidebar.footerId ? ` id="${escapeAttr(config.sidebar.footerId)}"` : ''}${config.sidebar.footerHidden ? ' style="display: none;"' : ''}>
                <p>${escapeHtml(config.sidebar.footerText)}</p>
            </div>`
    : '';
  const subtitleHtml = config.main.subtitleHtml
    ? config.main.subtitleHtml
    : (config.main.subtitleText ? `<p class="header-subtitle">${escapeHtml(config.main.subtitleText)}</p>` : '');
  const counterInnerHtml = `${config.main.counterExtraHtml ?? ''}
                    <div class="header-counter collection-header-counter">
                        <span class="counter-number collection-counter-number" id="${escapeAttr(config.main.counterId)}">0</span>
                        <span class="counter-label collection-counter-label"${config.main.counterLabelId ? ` id="${escapeAttr(config.main.counterLabelId)}"` : ''}>${escapeHtml(config.main.counterLabel)}</span>
                    </div>`;
  const renderedCounter = config.main.counterGroupClass
    ? `<div class="${escapeAttr(config.main.counterGroupClass)}">${counterInnerHtml}</div>`
    : counterInnerHtml;

  const mobileGridLabel = config.main.mobileGridLabel ?? config.main.title;
  const mobileToggleHtml = `<div class="collection-mobile-toggle" role="tablist" aria-label="Mobile view toggle">
            <button type="button" class="mobile-view-btn" data-view="list" data-action="switchCollectionView" data-action-args="list" role="tab" aria-selected="false">
                <svg class="ico-stroke" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-listView"/></svg>
                List
            </button>
            <button type="button" class="mobile-view-btn active" data-view="grid" data-action="switchCollectionView" data-action-args="grid" role="tab" aria-selected="true">
                <svg class="ico-stroke" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-gridView"/></svg>
                ${escapeHtml(mobileGridLabel)}
            </button>
        </div>`;

  return `<main class="${escapeAttr(config.layout.className)}" id="${escapeAttr(config.layout.id)}">
        ${mobileToggleHtml}
        <aside class="${escapeAttr(config.sidebar.className)}" id="${escapeAttr(config.sidebar.id)}">
            ${renderSidebarHeader(config.sidebar.collapseAction)}
            ${renderListDropdown(config.sidebar)}
            ${renderSearch(config.sidebar)}
            ${config.sidebar.extraHtml ?? ''}
            ${config.sidebar.loadingMessage ? `<div id="loading-sidebar" class="loading" style="padding: 1rem;"><p style="font-size: 0.85rem;">${escapeHtml(config.sidebar.loadingMessage)}</p></div>` : ''}
            ${sectionsWrapped}
            ${footerHtml}
        </aside>

        <div class="${escapeAttr(config.main.className)}">
            <header class="main-header collection-header">
                <div class="header-content">
                    <${config.main.titleTag ?? 'h1'} id="collection-title" data-default-title="${escapeAttr(config.main.title)}">${escapeHtml(config.main.title)}</${config.main.titleTag ?? 'h1'}>
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
