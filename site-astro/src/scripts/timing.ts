// Timing constants for animations, debounces, and watchdogs. Single
// source of truth so tuning the feel of an interaction is one edit, not
// a grep across files. Each value has a comment explaining what it
// controls and why it landed where it did.

export const TIMING = {
    /** Debounce ms for search inputs across books, essays, and global search. */
    searchDebounce: 120,

    /** Category-arrow flash duration after a sidebar expand. */
    arrowFlash: 500,

    /** Cover-to-detail flight animation (books grid → detail hero). */
    bookFlight: 320,

    /** Hard-nav fallback if the SPA-takeover path hasn't fired yet. Slightly
     *  longer than bookFlight so the flight visually completes first. */
    bookFlightFallback: 380,

    /** Watchdog: if SPA path never kicks in, force hard nav so the user
     *  isn't stranded on a half-faded page. */
    bookFlightWatchdog: 900,

    /** Grid-zoom flight animation (any grid → focused-card). */
    gridZoomFlight: 520,

    /** SPA-arrival reveal hold before stripping the class. */
    spaArrivalReveal: 240,

    /** Initial theme apply delay — small window for transitions to settle
     *  on first paint before user can trigger them. */
    themeApplySync: 1500
} as const;
