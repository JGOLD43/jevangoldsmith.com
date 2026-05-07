// Shared collection-page UI helpers. Previously exposed via
// window.JGCollectionUI; now standard ES module exports so consumers
// import only what they use and Vite tree-shakes unused helpers per
// page bundle.

import { debounce } from '../lib/debounce';
import { tryReadString, tryWrite } from '../lib/storage';

export { debounce };

export function toggleClearButton(buttonOrId: string | HTMLElement | null, show: boolean, displayValue = 'flex') {
    const button = typeof buttonOrId === 'string'
        ? document.getElementById(buttonOrId)
        : buttonOrId;
    if (!button) return;
    button.style.display = show ? displayValue : 'none';
}

function clearClasses(elements: Element[], classes: string[]) {
    elements.forEach((element) => {
        classes.forEach((className) => element.classList.remove(className));
    });
}

export function activateOnly(elements: Element[], activeElement: Element | null, classes: string[] = ['active']) {
    clearClasses(elements, classes);
    if (!activeElement) return;
    classes.forEach((className) => activeElement.classList.add(className));
}

export function collapseGroups({ buttonSelector, panelSelector, activeButton = null, activePanel = null }: {
    buttonSelector: string;
    panelSelector: string;
    activeButton?: Element | null;
    activePanel?: Element | null;
}) {
    const buttons = Array.from(document.querySelectorAll(buttonSelector));
    const panels = Array.from(document.querySelectorAll(panelSelector));
    clearClasses(buttons, ['active', 'expanded']);
    clearClasses(panels, ['expanded']);
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

    if (activeSelector) {
        clearClasses(Array.from(document.querySelectorAll(activeSelector)), ['active']);
    }
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
