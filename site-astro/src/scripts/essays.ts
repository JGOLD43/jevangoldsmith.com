import { formatDateShort, formatDate } from '../lib/dates';
import { debounce } from '../lib/debounce';
import { registerActions } from './action-dispatcher';
import { createCollectionRuntime } from './collection-runtime';
import { toggleClearButton } from './collection-ui';
import { readInlineJson } from './data-fetch';
import { cloneTemplateElement } from './dom-template';
import { onDomReady } from './dom-ready';
import { LOCAL_KEYS } from './storage-keys';

// Essays page orchestrator. State, filters, and view rendering live here
// because this page is their only consumer.

const ESSAY_CATEGORY_KEYS = ['philosophy', 'management', 'technology', 'personal', 'finance', 'writing'];

let essaysRuntime: AnyObj = null;

import type { Essay } from '../content.config';

interface EssaysState {
    activeCategory: string;
    currentIndex: number;
    essays: Essay[];
    filteredEssays: Essay[];
    searchTerm: string;
    sidebarCollapsed: boolean;
}

const state: EssaysState = {
    activeCategory: 'all',
    currentIndex: 0,
    essays: [],
    filteredEssays: [],
    searchTerm: '',
    sidebarCollapsed: false
};

// --- filters ---
function filterEssaysByCategory(essays: AnyObj[], category: string) {
    if (category === 'all') return essays;
    return essays.filter((essay) => String(essay.category || '').toLowerCase() === category);
}

function filterEssaysBySearch(essays: AnyObj[], term: string) {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return essays;
    return essays.filter((essay) => {
        const searchable = [essay.title, essay.subtitle || '', essay.category, essay.content || ''].join(' ').toLowerCase();
        return searchable.includes(normalized);
    });
}

function groupEssaysByCategory(essays: AnyObj[]) {
    const groups: Record<string, AnyObj[]> = Object.fromEntries(ESSAY_CATEGORY_KEYS.map((key) => [key, []]));
    essays.forEach((essay) => {
        const key = String(essay.category || '').toLowerCase();
        if (groups[key]) groups[key].push(essay);
    });
    return groups;
}

function findEssayIndex(essays: AnyObj[], essayId: string) {
    return essays.findIndex((essay) => essay.id === essayId);
}

// --- view ---
function renderEssayShell(container: HTMLElement, essay: AnyObj, filteredEssays: AnyObj[], currentIndex: number) {
    const article = container.querySelector<HTMLElement>('article.article-full');
    const nav = container.querySelector<HTMLElement>('.essay-nav');
    if (!article || !nav) return false;
    const total = filteredEssays.length;
    const atStart = currentIndex <= 0;
    const atEnd = currentIndex >= total - 1;
    const prevTitle = !atStart ? filteredEssays[currentIndex - 1].title : '';
    const nextTitle = !atEnd ? filteredEssays[currentIndex + 1].title : '';
    article.id = essay.id;
    const date = article.querySelector('.post-date');
    const category = article.querySelector('.post-category');
    const title = article.querySelector('h2');
    const subtitle = article.querySelector('p em');
    const subtitleWrap = subtitle?.closest('p') as HTMLElement | null;
    const content = article.querySelector<HTMLElement>('[data-essay-content]');
    if (date) date.textContent = formatDate(essay.date);
    if (category) category.textContent = essay.category || '';
    if (title) title.textContent = essay.title || '';
    if (subtitleWrap && subtitle) {
        subtitleWrap.hidden = !essay.subtitle;
        subtitle.textContent = essay.subtitle || '';
    }
    if (content) content.innerHTML = essay.content || '';
    const prev = nav.querySelector<HTMLButtonElement>('.essay-nav-prev');
    const next = nav.querySelector<HTMLButtonElement>('.essay-nav-next');
    const counter = nav.querySelector('.essay-nav-counter');
    const prevTitleEl = nav.querySelector('[data-essay-prev-title]');
    const nextTitleEl = nav.querySelector('[data-essay-next-title]');
    if (prev) prev.disabled = atStart;
    if (next) next.disabled = atEnd;
    if (counter) counter.textContent = `${currentIndex + 1} / ${total}`;
    if (prevTitleEl) prevTitleEl.textContent = prevTitle || '';
    if (nextTitleEl) nextTitleEl.textContent = nextTitle || '';
    return true;
}

function updateActiveSidebarLink(essayId: string) {
    document.querySelectorAll('.essay-link').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${essayId}`);
    });
}

let hasAdoptedSsrEssay = false;
function renderTemplateInto(container: HTMLElement, templateId: string) {
    const node = cloneTemplateElement<HTMLElement>(templateId);
    if (!node) return false;
    container.replaceChildren(node);
    return true;
}

function renderCurrentEssay(filteredEssays: AnyObj[], currentIndex: number) {
    const container = document.getElementById('essays-container');
    if (!container) return;
    if (!filteredEssays.length) {
        renderTemplateInto(container, 'essay-empty-template');
        return;
    }
    const essay = filteredEssays[currentIndex];
    // SSR adoption: on first render, if the DOM already shows the
    // intended essay (Astro pre-rendered it), skip the wipe+rebuild.
    // Eliminates the CLS jump caused by JS replacing markup that's
    // already in place.
    if (!hasAdoptedSsrEssay) {
        hasAdoptedSsrEssay = true;
        const existing = container.querySelector('article.article-full') as HTMLElement | null;
        if (existing && existing.id === essay.id) {
            updateActiveSidebarLink(essay.id);
            return;
        }
    }
    if (!renderEssayShell(container, essay, filteredEssays, currentIndex)) {
        renderTemplateInto(container, 'essay-render-error-template');
    }
    updateActiveSidebarLink(essay.id);
}

function renderEssaySidebar(groups: Record<string, AnyObj[]>) {
    const hasSsrEssayLinks = Array.from(document.querySelectorAll('.category-essays'))
        .some((container) => container.children.length > 0);
    const countAll = document.getElementById('count-all');
    if (countAll) {
        const total = Object.values(groups).reduce((sum, essays) => sum + essays.length, 0);
        countAll.textContent = String(total);
    }
    Object.keys(groups).forEach((category) => {
        const essays = groups[category];
        const countEl = document.getElementById(`count-${category}`);
        const section = countEl?.closest('.sidebar-section') as HTMLElement | null;
        const container = document.getElementById(`category-${category}`);
        if (countEl) countEl.textContent = String(essays.length);
        if (section) section.style.display = essays.length === 0 ? 'none' : 'block';
        if (container && !container.children.length && !hasSsrEssayLinks) {
            const fragment = document.createDocumentFragment();
            essays.forEach((essay: AnyObj) => {
                const link = cloneTemplateElement<HTMLAnchorElement>('essay-sidebar-link-template');
                if (!link) return;
                link.href = `#${essay.id}`;
                link.dataset.actionArgs = encodeURIComponent(essay.id);
                const title = link.querySelector('[data-essay-link-title]');
                const date = link.querySelector('[data-essay-link-date]');
                if (title) title.textContent = essay.title || '';
                if (date) date.textContent = formatDateShort(essay.date);
                fragment.appendChild(link);
            });
            container.replaceChildren(fragment);
        }
    });
}

function updateEssayCount(count: number) {
    const countEl = document.getElementById('essay-count');
    if (countEl) countEl.textContent = String(count);
}

function showEssayErrorMessage() {
    const container = document.getElementById('essays-container');
    if (!container) return;
    renderTemplateInto(container, 'essay-load-error-template');
}

function scrollEssaysToTop() {
    const main = document.querySelector('.essays-main');
    if (main) {
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- data load ---
function loadEssays() {
    const data = readInlineJson<AnyObj>('jg-essays-data');
    if (!data || !Array.isArray(data.essays)) {
        showEssayErrorMessage();
        return;
    }
    state.essays = (data.essays as AnyObj[])
        .filter((essay: AnyObj) => essay.status === 'published')
        .sort((left: AnyObj, right: AnyObj) => new Date(right.date).getTime() - new Date(left.date).getTime());
    state.filteredEssays = state.essays;
    renderFromState();
}

// --- runtime ---
function getDerivedEssays() {
    const categoryFiltered = filterEssaysByCategory(state.essays, state.activeCategory);
    return filterEssaysBySearch(categoryFiltered, state.searchTerm);
}

function getVisibleEssayState(filteredEssays: AnyObj[]) {
    const currentIndex = Math.max(0, Math.min(state.currentIndex, Math.max(filteredEssays.length - 1, 0)));
    state.filteredEssays = filteredEssays;
    state.currentIndex = currentIndex;
    return { essays: filteredEssays, currentIndex };
}

function renderFromState() { essaysRuntime?.render(); }

function buildCollectionController() {
    essaysRuntime = createCollectionRuntime({
        getState: () => ({ ...state }),
        getFilteredItems: () => getDerivedEssays(),
        getVisibleItems: (filteredEssays: AnyObj[]) => getVisibleEssayState(filteredEssays),
        renderSidebar: () => renderEssaySidebar(groupEssaysByCategory(state.essays)),
        groupItems: () => groupEssaysByCategory(state.essays),
        renderVisibleItems: (visibleState: AnyObj) => renderCurrentEssay(visibleState.essays, visibleState.currentIndex),
        updateCount: (visibleState: AnyObj) => updateEssayCount(visibleState.essays.length),
        updateControls: (s: AnyObj) => toggleClearButton('search-clear-btn', Boolean(s.searchTerm), 'block'),
        group: {
            allButtonSelector: '[data-action="toggleCategory"][data-action-args="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category: string) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-essays'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'essay-search',
        storageKey: LOCAL_KEYS.essaysSidebar,
        layoutId: 'essays-layout',
        sidebarId: 'essays-sidebar',
        defaultCollapsed: false
    });
}

function applyFilter(mutate: () => void) {
    mutate();
    state.activeCategory = 'all';
    state.currentIndex = 0;
    essaysRuntime?.resetGrouping();
    renderFromState();
}

function toggleCategory(category: string, event?: Event) {
    const button = (event?.target as Element | undefined)?.closest('.sidebar-category');
    const panel = category === 'all' ? null : document.getElementById(`category-${category}`);
    essaysRuntime?.toggleGroup({
        value: category,
        button,
        panel,
        onCollapse: () => {
            state.activeCategory = 'all';
            state.currentIndex = 0;
        },
        onExpand: () => {
            state.activeCategory = category;
            state.currentIndex = 0;
        }
    });
}

const searchEssays = debounce((term: string) => {
    applyFilter(() => { state.searchTerm = String(term || '').trim().toLowerCase(); });
});

function clearEssaySearch() {
    essaysRuntime?.clearSearchInput();
    applyFilter(() => { state.searchTerm = ''; });
}

function prevEssay() {
    if (state.currentIndex <= 0) return;
    state.currentIndex -= 1;
    renderFromState();
    scrollEssaysToTop();
}

function nextEssay() {
    if (state.currentIndex >= state.filteredEssays.length - 1) return;
    state.currentIndex += 1;
    renderFromState();
    scrollEssaysToTop();
}

function scrollToEssay(essayId: string, event?: Event) {
    event?.preventDefault();
    const filteredIndex = findEssayIndex(state.filteredEssays, essayId);
    if (filteredIndex >= 0) {
        state.currentIndex = filteredIndex;
        renderFromState();
        scrollEssaysToTop();
        return;
    }
    const fullIndex = findEssayIndex(state.essays, essayId);
    if (fullIndex < 0) return;
    state.activeCategory = 'all';
    state.currentIndex = fullIndex;
    essaysRuntime?.resetGrouping();
    renderFromState();
    scrollEssaysToTop();
}

function toggleEssaysSidebar() {
    state.sidebarCollapsed = Boolean(essaysRuntime?.toggleSidebar());
}

function restoreSidebarState() {
    state.sidebarCollapsed = Boolean(essaysRuntime?.restoreSidebar());
}

function toggleListDropdown() { essaysRuntime?.toggleListDropdown(); }

function applyEssayView(mode: 'reader' | 'cards') {
    const reader = document.getElementById('essays-container');
    const cards = document.getElementById('essays-cards');
    const main = document.querySelector('.essays-main') as HTMLElement | null;
    if (!reader || !cards) return;
    const next = mode === 'cards' ? 'cards' : 'reader';
    reader.hidden = next !== 'reader';
    cards.hidden = next !== 'cards';
    if (main) main.setAttribute('data-view', next);
    document.querySelectorAll<HTMLButtonElement>('.essays-view-btn').forEach((btn) => {
        const isActive = btn.dataset.view === next;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });
}

function setEssayView(mode: string) {
    applyEssayView(mode === 'cards' ? 'cards' : 'reader');
}

function restoreEssayView() {
    // List is always the default landing view; clicking a row opens the
    // reader, and the back link returns to the list. View state is not
    // persisted, so refreshing the page always brings the index back.
    applyEssayView('cards');
}

function openEssayFromCard(essayId: string, event?: Event) {
    event?.preventDefault();
    applyEssayView('reader');
    const fullIndex = findEssayIndex(state.essays, essayId);
    if (fullIndex < 0) return;
    state.activeCategory = 'all';
    state.currentIndex = fullIndex;
    essaysRuntime?.resetGrouping();
    renderFromState();
    scrollEssaysToTop();
}

registerActions({
    clearEssaySearch,
    nextEssay,
    openEssayFromCard,
    prevEssay,
    scrollToEssay,
    searchEssays,
    setEssayView,
    toggleCategory,
    toggleEssaysSidebar,
    toggleListDropdown
});

function initEssaysPage() {
    buildCollectionController();
    restoreSidebarState();
    restoreEssayView();
    document.addEventListener('click', (event) => {
        essaysRuntime?.closeDropdownOnOutsideClick(event);
    });
    loadEssays();
}

onDomReady(initEssaysPage, 'essays init');
