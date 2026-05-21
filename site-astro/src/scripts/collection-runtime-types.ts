export interface CollectionRuntimeGroupCfg {
    allButtonSelector?: string;
    buttonSelector?: string;
    panelSelector?: string;
    panelForValue?: (value: string) => Element | null;
}

export interface CollectionRuntimeActions {
    clearSearch?: string;
    filter?: string;
    search?: string;
    toggleSidebar?: string;
    toggleDropdown?: string;
}

export interface CollectionRuntimeConfig {
    // Selectors / dom ids
    cardSelector?: string;
    buttonSelector?: string;
    allButtonSelector?: string;
    counterId?: string;
    layoutId?: string;
    sidebarId?: string;
    searchInputId?: string;
    searchClearButtonId?: string;
    searchClearDisplay?: string;
    visibleDisplay?: string;
    dropdownId?: string;
    gridId?: string;

    // Datasets / behavior flags
    categoryDataset?: string;
    searchDataset?: string;
    categoryMode?: 'exact' | 'tokens';
    defaultCategory?: string;
    storageKey?: string;
    defaultCollapsed?: boolean;
    useDisplayStyle?: boolean;
    resetCategoryOnSearch?: boolean;

    // Action name registry
    actions?: CollectionRuntimeActions;

    // Group toggling (sidebar collapsing categories)
    group?: CollectionRuntimeGroupCfg;

    // Optional grid-zoom config (passed straight to initGridZoom).
    zoom?: AnyObj;

    // Render hooks (managed mode)
    getState?: () => AnyObj;
    getFilteredItems?: (state: AnyObj) => AnyObj;
    getVisibleItems?: (filtered: AnyObj, state: AnyObj) => AnyObj;
    groupItems?: (filtered: AnyObj) => AnyObj;
    renderSidebar?: (groups: AnyObj, state: AnyObj) => void;
    renderVisibleItems?: (items: AnyObj, state: AnyObj) => void;
    updateCount?: (visible: AnyObj, state: AnyObj) => void;
    updateControls?: (state: AnyObj, filtered: AnyObj, visible: AnyObj) => void;
    onRender?: (info?: AnyObj) => void;
}
