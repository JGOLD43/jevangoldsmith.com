// Collection runtime config. Two modes:
//
// 1. DOM-mode (no getFilteredItems supplied): runtime owns rendering by
//    showing/hiding SSR'd cards based on data-* attributes. Used by pages
//    that ship their cards in HTML and just need filter/search wiring
//    (podcasts, challenges, projects, people).
//
// 2. Managed mode (getFilteredItems supplied): caller owns rendering via
//    render-callback hooks. Used by pages with dynamic data + custom
//    rendering shapes (books, movies/letterboxd, essays).
//
// The type below is the union of both modes' fields. Each field is
// annotated with which mode uses it. If you add a new field, annotate it.

interface CollectionRuntimeGroupCfg {
    allButtonSelector?: string;
    buttonSelector?: string;
    panelSelector?: string;
    panelForValue?: (value: string) => Element | null;
}

interface CollectionRuntimeActions {
    clearSearch?: string;
    filter?: string;
    search?: string;
    toggleSidebar?: string;
    toggleDropdown?: string;
}

/**
 * Fields used by both modes (universal). These configure the DOM hooks
 * the runtime touches regardless of where rendering happens.
 */
export interface CoreCollectionConfig {
    /** Sidebar/dropdown layout dom ids (used for collapse persistence). */
    layoutId?: string;
    sidebarId?: string;
    /** localStorage key for sidebar collapsed state. See storage-keys.ts. */
    storageKey?: string;
    defaultCollapsed?: boolean;
    /** Search input + clear button wiring. */
    searchInputId?: string;
    searchClearButtonId?: string;
    /** Optional dropdown body to close on outside-click. */
    dropdownId?: string;
    /** Group toggling (sidebar collapsing categories). */
    group?: CollectionRuntimeGroupCfg;
}

/**
 * DOM-mode only: runtime owns SSR'd card visibility via filter/search.
 * Used by podcasts, challenges, projects, people.
 */
export interface DomCollectionConfig extends CoreCollectionConfig {
    cardSelector?: string;
    buttonSelector?: string;
    allButtonSelector?: string;
    counterId?: string;
    searchClearDisplay?: string;
    visibleDisplay?: string;
    gridId?: string;
    /** Datasets attribute name read off each card. */
    categoryDataset?: string;
    searchDataset?: string;
    /** 'exact' = full string compare; 'tokens' = whitespace-tokenized. */
    categoryMode?: 'exact' | 'tokens';
    defaultCategory?: string;
    /** When true, toggles `display:` style instead of `[hidden]`. */
    useDisplayStyle?: boolean;
    resetCategoryOnSearch?: boolean;
    /** Action name registry — registers default handlers under these names. */
    actions?: CollectionRuntimeActions;
    /** grid-zoom config (passed straight to initGridZoom). */
    zoom?: AnyObj;
    onRender?: (info?: AnyObj) => void;
}

/**
 * Managed-mode only: caller owns rendering via these hooks. Used by
 * books, movies/letterboxd, essays.
 */
export interface ManagedCollectionConfig extends CoreCollectionConfig {
    getState: () => AnyObj;
    getFilteredItems: (state: AnyObj) => AnyObj;
    getVisibleItems?: (filtered: AnyObj, state: AnyObj) => AnyObj;
    groupItems?: (filtered: AnyObj) => AnyObj;
    renderSidebar?: (groups: AnyObj, state: AnyObj) => void;
    renderVisibleItems?: (items: AnyObj, state: AnyObj) => void;
    updateCount?: (visible: AnyObj, state: AnyObj) => void;
    updateControls?: (state: AnyObj, filtered: AnyObj, visible: AnyObj) => void;
    onRender?: (info?: AnyObj) => void;
}

/**
 * Union of both modes. createCollectionRuntime branches on whether
 * getFilteredItems is supplied.
 */
export type CollectionRuntimeConfig = DomCollectionConfig | ManagedCollectionConfig;
