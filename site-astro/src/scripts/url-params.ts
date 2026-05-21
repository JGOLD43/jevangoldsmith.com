// Source-of-truth registry for query-string parameters the site responds to.
//
// Why this exists
// ---------------
// Deep links (?book=Atomic+Habits, ?movie=..., ?focus=now) are part of the
// site's contract: shared URLs must keep working. Without a registry, a
// new contributor adding `?essay=...` support has no way to know which
// params are already taken or what their expected shape is.
//
// What this is
// ------------
// Typed constants for every URL param the site reads. Centralized so
// find-references reveals every consumer instantly.

export const URL_PARAMS = {
    book: 'book',
    movie: 'movie',
    focus: 'focus'
} as const;

export type UrlParam = typeof URL_PARAMS[keyof typeof URL_PARAMS];
