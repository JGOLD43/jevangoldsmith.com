// Source-of-truth registry for every `data-action` name used in markup.
//
// Why this exists
// ---------------
// The action-dispatcher is a runtime pub-sub: scripts call registerActions
// as side effects of being imported by a page. Markup invokes actions via
// `data-action="someName"`. Without a registry, a contributor adding new
// markup has no way to know which names are valid for the current page
// without reading every script that page imports.
//
// What this is
// ------------
// A typed const map of every action name currently in use, paired with
// the script that registers it. The dispatcher runtime warns on misses
// (typed as a typo); this registry makes the valid set discoverable at
// build time via "find references" / autocomplete.
//
// How to use
// ----------
// In markup (Astro):    `data-action={ACTION_NAMES.openBookFromGrid}`
// In scripts:           `registerActions({ [ACTION_NAMES.openBookFromGrid]: handler })`
//
// Adding a new action
// -------------------
// 1. Add the entry here under the right script's section
// 2. Register the handler in that script via registerActions
// 3. Reference ACTION_NAMES.theNewOne from markup
//
// The runtime guarantees nothing about whether an action's handler is
// loaded on the current page — that's a function of which scripts the
// page imports. The registry just enumerates the valid namespace.

export const ACTION_NAMES = {
    // books.ts (kebab-case legacy)
    bookLink: 'book-link',
    clearSearch: 'clear-search',
    clearStarFilter: 'clear-star-filter',
    closeBookModal: 'close-book-modal',
    closeCategoryModal: 'close-category-modal',
    openBookFromGrid: 'open-book-from-grid',
    openCategoryModal: 'open-category-modal',
    setViewMode: 'set-view-mode',
    toggleListDropdown: 'toggle-list-dropdown',
    toggleSidebar: 'toggle-sidebar',
    toggleViewMode: 'toggle-view-mode',

    // adventures
    closeAdventureDetail: 'closeAdventureDetail',
    closeInlineStory: 'closeInlineStory',
    closeLightbox: 'closeLightbox',
    nextImage: 'nextImage',
    openAdventureLightbox: 'open-adventure-lightbox',
    openLightbox: 'open-lightbox',
    prevImage: 'prevImage',
    selectAdventure: 'select-adventure',
    toggleControls: 'toggle-controls',

    // people
    closePersonDetail: 'close-person-detail',
    filterPeopleSource: 'filterPeopleSource',

    // essays
    nextEssay: 'nextEssay',
    openEssayFromCard: 'openEssayFromCard',
    prevEssay: 'prevEssay',
    scrollToEssay: 'scrollToEssay',
    setEssayView: 'setEssayView',

    // movies / letterboxd
    closeMovieModal: 'closeMovieModal',
    scrollToMovie: 'scrollToMovie',

    // shared collection runtime
    filterByCategory: 'filterByCategory',
    resetFilters: 'resetFilters',
    scrollToStory: 'scrollToStory',
    switchCollectionView: 'switchCollectionView',
    switchMobileView: 'switchMobileView',
    toggleCategory: 'toggleCategory',
    toggleFilter: 'toggleFilter'
} as const;

export type ActionName = typeof ACTION_NAMES[keyof typeof ACTION_NAMES];
