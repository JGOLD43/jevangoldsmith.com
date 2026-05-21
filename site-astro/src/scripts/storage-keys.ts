// Source-of-truth registry for persistent state keys.
//
// Why this exists
// ---------------
// Without a registry, collision risk is real: two pages reaching for the
// same key silently overwrite each other. The audit found localStorage
// + sessionStorage usage scattered across theme.ts, letterboxd.ts,
// books-flight.ts, collection-runtime.ts, and inline scripts in
// Base.astro + pages/books/[slug].astro.
//
// What this is
// ------------
// Typed constants for every key written by the site. Importing these
// instead of using string literals makes the contract greppable, gives
// IDEs find-references, and lets TS catch typos.
//
// Note on inline scripts
// ----------------------
// The theme-guard script in Base.astro runs before module loading, so
// it can't import from this file. It uses string literals matching the
// constants below; if you change a value here, update Base.astro too.
// Same for the book-flight read in pages/books/[slug].astro.

export const LOCAL_KEYS = {
    theme: 'jg-theme',
    workMode: 'jg-work-mode',
    booksSidebar: 'books-sidebar-collapsed',
    moviesSidebar: 'movies-sidebar-collapsed',
    essaysSidebar: 'essays-sidebar-collapsed'
} as const;

export const SESSION_KEYS = {
    bookFlight: 'book-flight-arrival'
} as const;

export type LocalKey = typeof LOCAL_KEYS[keyof typeof LOCAL_KEYS];
export type SessionKey = typeof SESSION_KEYS[keyof typeof SESSION_KEYS];
