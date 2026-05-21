// Layout breakpoints. Single source of truth for the mobile/desktop split
// referenced in books-flight.ts and elsewhere. CSS media queries also
// use 768px in some places — keep these aligned if CSS changes.

export const BREAKPOINT = {
    /** Mobile/desktop split for the book-flight + hero-offset math. */
    mobile: 640
} as const;

/** Empirically measured destination Y-offset for the book-flight clone
 *  (Back-to-Books link + hero top margin under the navbar). Update if
 *  the detail page hero layout changes. */
export const HERO_OFFSET_TOP = {
    mobile: 123,
    desktop: 165
} as const;
