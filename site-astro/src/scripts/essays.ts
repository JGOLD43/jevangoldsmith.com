import { escapeHtml as escapeHTML, escapeAttr } from '../lib/html-escape';
import { createCollectionRuntime } from './collection-runtime';
import { debounce, toggleClearButton } from './collection-ui';
import { registerActions } from './action-dispatcher';

let essaysRuntime: AnyObj = null;

function readInlineEssaysData(): AnyObj | null {
    const node = document.getElementById('jg-essays-data');
    if (!node || !node.textContent) return null;
    try {
        return JSON.parse(node.textContent);
    } catch {
        return null;
    }
}

// Essays page orchestrator. State, filters, and view rendering live here because
// this page is their only consumer.
const ESSAY_CATEGORY_KEYS = ['philosophy', 'management', 'technology', 'personal', 'finance', 'writing'];

const essaysState = (() => {
    const state = {
        activeCategory: 'all',
        currentIndex: 0,
        essays: [],
        filteredEssays: [],
        searchTerm: '',
        sidebarCollapsed: false
    };

    return {
        clearSearchTerm() {
            state.searchTerm = '';
        },
        get() {
            return {
                ...state,
                essays: [...state.essays],
                filteredEssays: [...state.filteredEssays]
            };
        },
        setActiveCategory(category: string) {
            state.activeCategory = category || 'all';
        },
        setCurrentIndex(index: number) {
            state.currentIndex = index;
        },
        setEssays(essays: AnyObj[]) {
            state.essays = Array.isArray(essays) ? essays : [];
        },
        setFilteredEssays(essays: AnyObj[]) {
            state.filteredEssays = Array.isArray(essays) ? essays : [];
        },
        setSearchTerm(term: string) {
            state.searchTerm = String(term || '').trim().toLowerCase();
        },
        setSidebarCollapsed(collapsed: boolean) {
            state.sidebarCollapsed = Boolean(collapsed);
        }
    };
})();

function filterEssaysByCategory(essays: AnyObj[], category: string) {
    if (category === 'all') {
        return essays;
    }
    return essays.filter((essay) => String(essay.category || '').toLowerCase() === category);
}

function filterEssaysBySearch(essays: AnyObj[], term: string) {
    const normalized = String(term || '').trim().toLowerCase();
    if (!normalized) {
        return essays;
    }

    return essays.filter((essay) => {
        const searchable = [
            essay.title,
            essay.subtitle || '',
            essay.category,
            essay.content || ''
        ].join(' ').toLowerCase();

        return searchable.includes(normalized);
    });
}

function groupEssaysByCategory(essays: AnyObj[]) {
    const groups: Record<string, AnyObj[]> = Object.fromEntries(
        ESSAY_CATEGORY_KEYS.map((key) => [key, []])
    );

    essays.forEach((essay) => {
        const key = String(essay.category || '').toLowerCase();
        if (groups[key]) {
            groups[key].push(essay);
        }
    });

    return groups;
}

function findEssayIndex(essays: AnyObj[], essayId: string) {
    return essays.findIndex((essay) => essay.id === essayId);
}

import { formatDate, formatDateShort } from '../lib/dates';

function createEssayArticle(essay: AnyObj) {
    const article = document.createElement('article');
    article.className = 'article-full';
    article.id = essay.id;
    article.innerHTML = `
        <div class="post-meta">
            <span class="post-date">${escapeHTML(formatDate(essay.date))}</span>
            <span class="post-category">${escapeHTML(essay.category)}</span>
        </div>
        <h2>${escapeHTML(essay.title)}</h2>
        ${essay.subtitle ? `<p><em>${escapeHTML(essay.subtitle)}</em></p>` : ''}
        ${essay.content || ''}
    `;
    return article;
}

function createEssayNav(filteredEssays: AnyObj[], currentIndex: number) {
    const nav = document.createElement('div');
    nav.className = 'essay-nav';
    const total = filteredEssays.length;
    const atStart = currentIndex <= 0;
    const atEnd = currentIndex >= total - 1;
    const prevTitle = !atStart ? filteredEssays[currentIndex - 1].title : '';
    const nextTitle = !atEnd ? filteredEssays[currentIndex + 1].title : '';

    nav.innerHTML = `
        <button class="essay-nav-btn essay-nav-prev" ${atStart ? 'disabled' : ''} data-action="prevEssay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span class="essay-nav-label">
                <span class="essay-nav-direction">Previous</span>
                ${prevTitle ? `<span class="essay-nav-title">${escapeHTML(prevTitle)}</span>` : ''}
            </span>
        </button>
        <span class="essay-nav-counter">${currentIndex + 1} / ${total}</span>
        <button class="essay-nav-btn essay-nav-next" ${atEnd ? 'disabled' : ''} data-action="nextEssay">
            <span class="essay-nav-label essay-nav-label-right">
                <span class="essay-nav-direction">Next</span>
                ${nextTitle ? `<span class="essay-nav-title">${escapeHTML(nextTitle)}</span>` : ''}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
    `;
    return nav;
}

function updateActiveSidebarLink(essayId: string) {
    document.querySelectorAll('.essay-link').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${essayId}`);
    });
}

function renderCurrentEssay(filteredEssays: AnyObj[], currentIndex: number) {
    const container = document.getElementById('essays-container');
    if (!container) return;

    container.innerHTML = '';

    if (!filteredEssays.length) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">No essays published yet.</p>';
        return;
    }

    const essay = filteredEssays[currentIndex];
    container.appendChild(createEssayArticle(essay));
    container.appendChild(createEssayNav(filteredEssays, currentIndex));
    updateActiveSidebarLink(essay.id);
}

function renderEssaySidebar(groups: Record<string, AnyObj[]>) {
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

        if (countEl) {
            countEl.textContent = String(essays.length);
        }

        if (section) {
            section.style.display = essays.length === 0 ? 'none' : 'block';
        }

        if (container) {
            container.innerHTML = essays.map((essay: AnyObj) => `
                <a href="#${escapeAttr(essay.id)}" class="essay-link" data-action="scrollToEssay" data-action-args="${encodeURIComponent(essay.id)}" data-action-eventobj="true">
                    <div>${escapeHTML(essay.title)}</div>
                    <div class="essay-link-date">${escapeHTML(formatDateShort(essay.date))}</div>
                </a>
            `).join('');
        }
    });
}

function updateEssayCount(count: number) {
    const countEl = document.getElementById('essay-count');
    if (countEl) {
        countEl.textContent = String(count);
    }
}

function showEssayErrorMessage() {
    const container = document.getElementById('essays-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="color: var(--accent-color); font-size: 1.2rem; margin-bottom: 1rem;">Unable to load essays</p>
            <p style="color: var(--text-light);">Please try refreshing the page.</p>
        </div>
    `;
}

function scrollEssaysToTop() {
    const main = document.querySelector('.essays-main');
    if (main) {
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadEssays() {
    const data = readInlineEssaysData();
    if (!data || !Array.isArray(data.essays)) {
        showEssayErrorMessage();
        return;
    }
    const publishedEssays = (data.essays as AnyObj[])
        .filter((essay: AnyObj) => essay.status === 'published')
        .sort((left: AnyObj, right: AnyObj) => new Date(right.date).getTime() - new Date(left.date).getTime());

    essaysState.setEssays(publishedEssays);
    essaysState.setFilteredEssays(publishedEssays);
    renderFromState();
}

function getDerivedEssays() {
    const state = essaysState.get();
    const categoryFiltered = filterEssaysByCategory(state.essays, state.activeCategory);
    return filterEssaysBySearch(categoryFiltered, state.searchTerm);
}

function getVisibleEssayState(filteredEssays: AnyObj[]) {
    const state = essaysState.get();
    const currentIndex = Math.max(0, Math.min(state.currentIndex, Math.max(filteredEssays.length - 1, 0)));
    essaysState.setFilteredEssays(filteredEssays);
    essaysState.setCurrentIndex(currentIndex);
    return {
        essays: filteredEssays,
        currentIndex
    };
}

function renderFromState() {
    essaysRuntime?.render();
}

function buildCollectionController() {
    essaysRuntime = createCollectionRuntime({
        getState: () => essaysState.get(),
        getFilteredItems: () => getDerivedEssays(),
        getVisibleItems: (filteredEssays: AnyObj[]) => getVisibleEssayState(filteredEssays),
        renderSidebar: () => renderEssaySidebar(groupEssaysByCategory(essaysState.get().essays)),
        groupItems: () => groupEssaysByCategory(essaysState.get().essays),
        renderVisibleItems: (visibleState: AnyObj) => renderCurrentEssay(visibleState.essays, visibleState.currentIndex),
        updateCount: (visibleState: AnyObj) => updateEssayCount(visibleState.essays.length),
        updateControls: (state: AnyObj) => toggleClearButton('search-clear-btn', Boolean(state.searchTerm), 'block'),
        group: {
            allButtonSelector: '[data-action="toggleCategory"][data-action-args="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category: string) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-essays'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'essay-search',
        storageKey: 'essays-sidebar-collapsed',
        layoutId: 'essays-layout',
        sidebarId: 'essays-sidebar',
        defaultCollapsed: false
    });
}

function toggleCategory(category: string, event?: Event) {
    const button = (event?.target as Element | undefined)?.closest('.sidebar-category');
    const panel = category === 'all' ? null : document.getElementById(`category-${category}`);

    essaysRuntime?.toggleGroup({
        value: category,
        button,
        panel,
        onCollapse: () => {
            essaysState.setActiveCategory('all');
            essaysState.setCurrentIndex(0);
        },
        onExpand: () => {
            essaysState.setActiveCategory(category);
            essaysState.setCurrentIndex(0);
        }
    });
}

const searchEssays = debounce((term: string) => {
    essaysState.setSearchTerm(term);
    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(0);
    essaysRuntime?.resetGrouping();
    renderFromState();
});

function clearEssaySearch() {
    essaysRuntime?.clearSearchInput();
    essaysState.clearSearchTerm();
    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(0);
    essaysRuntime?.resetGrouping();
    renderFromState();
}

function prevEssay() {
    const state = essaysState.get();
    if (state.currentIndex <= 0) return;
    essaysState.setCurrentIndex(state.currentIndex - 1);
    renderFromState();
    scrollEssaysToTop();
}

function nextEssay() {
    const state = essaysState.get();
    if (state.currentIndex >= state.filteredEssays.length - 1) return;
    essaysState.setCurrentIndex(state.currentIndex + 1);
    renderFromState();
    scrollEssaysToTop();
}

function scrollToEssay(essayId: string, event?: Event) {
    event?.preventDefault();

    const state = essaysState.get();
    const filteredIndex = findEssayIndex(state.filteredEssays, essayId);
    if (filteredIndex >= 0) {
        essaysState.setCurrentIndex(filteredIndex);
        renderFromState();
        scrollEssaysToTop();
        return;
    }

    const fullIndex = findEssayIndex(state.essays, essayId);
    if (fullIndex < 0) return;

    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(fullIndex);
    essaysRuntime?.resetGrouping();
    renderFromState();
    scrollEssaysToTop();
}

function toggleEssaysSidebar() {
    const isCollapsed = essaysRuntime?.toggleSidebar();
    essaysState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = essaysRuntime?.restoreSidebar();
    essaysState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    essaysRuntime?.toggleListDropdown();
}

registerActions({
    clearEssaySearch,
    nextEssay,
    prevEssay,
    scrollToEssay,
    searchEssays,
    toggleCategory,
    toggleEssaysSidebar,
    toggleListDropdown
});

function initEssaysPage() {
    buildCollectionController();
    restoreSidebarState();
    document.addEventListener('click', (event) => {
        essaysRuntime?.closeDropdownOnOutsideClick(event);
    });
    loadEssays();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEssaysPage, { once: true });
} else {
    initEssaysPage();
}

export {};
