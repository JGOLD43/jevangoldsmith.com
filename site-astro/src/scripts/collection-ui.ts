// Shared collection-page UI helpers.

import { tryReadString, tryWrite } from '../lib/storage';

export function toggleClearButton(buttonOrId: string | HTMLElement | null, show: boolean, displayValue = 'flex') {
    const button = typeof buttonOrId === 'string'
        ? document.getElementById(buttonOrId)
        : buttonOrId;
    if (!button) return;
    button.style.display = show ? displayValue : 'none';
}

const clearAll = (els: Iterable<Element>, classes: string[]) => {
    for (const el of els) for (const c of classes) el.classList.remove(c);
};

export function activateOnly(elements: Element[], activeElement: Element | null, classes: string[] = ['active']) {
    clearAll(elements, classes);
    if (!activeElement) return;
    classes.forEach((className) => activeElement.classList.add(className));
}

export function collapseGroups({ buttonSelector, panelSelector, activeButton = null, activePanel = null }: {
    buttonSelector: string;
    panelSelector: string;
    activeButton?: Element | null;
    activePanel?: Element | null;
}) {
    clearAll(document.querySelectorAll(buttonSelector), ['active', 'expanded']);
    clearAll(document.querySelectorAll(panelSelector), ['expanded']);
    if (activeButton) activeButton.classList.add('active');
    if (activePanel) {
        activeButton?.classList.add('expanded');
        activePanel.classList.add('expanded');
    }
}

export function highlightAndScroll(target: HTMLElement | null, { activeSelector = null, activeElement = null, transform = 'scale(1.05)', shadow = '0 8px 30px rgba(102, 126, 234, 0.3)', duration = 2000 }: {
    activeSelector?: string | null;
    activeElement?: Element | null;
    transform?: string;
    shadow?: string;
    duration?: number;
} = {}) {
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.style.transform = transform;
    target.style.boxShadow = shadow;
    setTimeout(() => {
        target.style.transform = '';
        target.style.boxShadow = '';
    }, duration);

    if (activeSelector) clearAll(document.querySelectorAll(activeSelector), ['active']);
    activeElement?.classList.add('active');
}

export function closeDropdownOnOutsideClick(dropdownId: string, event: Event) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown && !dropdown.contains(event.target as Node)) {
        dropdown.classList.remove('open');
    }
}

export function setCollapsedState({
    layout,
    sidebar,
    isCollapsed,
    layoutClass = 'sidebar-collapsed',
    sidebarClass = 'collapsed'
}: {
    layout: HTMLElement | null;
    sidebar: HTMLElement | null;
    isCollapsed: boolean;
    layoutClass?: string;
    sidebarClass?: string;
}) {
    layout?.classList.toggle(layoutClass, isCollapsed);
    sidebar?.classList.toggle(sidebarClass, isCollapsed);
    // Mirror state on every sidebar-toggle button for screen readers.
    // WCAG 1.3.1 — communicate expansion state via ARIA, not just visuals.
    if (layout) {
        const toggles = layout.querySelectorAll<HTMLElement>('[data-action="toggle-sidebar"], [data-action="togglePodcastSidebar"], [data-action="toggleProjectSidebar"], [data-action="toggleChallengeSidebar"], [data-action="togglePeopleSidebar"], [data-action="toggleEssaySidebar"], [data-action="toggleMovieSidebar"]');
        toggles.forEach((btn) => btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true'));
    }
    return isCollapsed;
}

type RestoreOpts = {
    storageKey: string;
    layoutId: string;
    sidebarId: string;
    defaultCollapsed?: boolean;
    layoutClass?: string;
    sidebarClass?: string;
    onChange?: ((collapsed: boolean) => void) | null;
};

export function restoreCollapsedState({
    storageKey,
    layoutId,
    sidebarId,
    defaultCollapsed = true,
    layoutClass = 'sidebar-collapsed',
    sidebarClass = 'collapsed',
    onChange = null
}: RestoreOpts) {
    const layout = document.getElementById(layoutId);
    const sidebar = document.getElementById(sidebarId);
    if (!layout || !sidebar) return false;
    const storedValue = tryReadString(storageKey);
    const isCollapsed = storedValue == null
        ? defaultCollapsed
        : storedValue !== 'false' && storedValue !== '0';
    setCollapsedState({ layout, sidebar, isCollapsed, layoutClass, sidebarClass });
    onChange?.(isCollapsed);
    return isCollapsed;
}

export function toggleCollapsedState({
    storageKey,
    layoutId,
    sidebarId,
    layoutClass = 'sidebar-collapsed',
    sidebarClass = 'collapsed',
    onChange = null
}: Omit<RestoreOpts, 'defaultCollapsed'>) {
    const layout = document.getElementById(layoutId);
    const sidebar = document.getElementById(sidebarId);
    if (!layout || !sidebar) return false;
    const isCollapsed = !sidebar.classList.contains(sidebarClass);
    setCollapsedState({ layout, sidebar, isCollapsed, layoutClass, sidebarClass });
    tryWrite(storageKey, isCollapsed ? 'true' : 'false');
    onChange?.(isCollapsed);
    return isCollapsed;
}
