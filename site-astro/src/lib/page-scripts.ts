// Per-page script lists. Phase 7 (slices 1–7) + Phase 5 (slice 12): every
// page is now on Vite-emitted Astro modules. theme + analytics ship from
// Base.astro globally, dompurify is an npm dep, and the adventures pile
// is concatenated into a single src/scripts/adventures.js module that
// shares cross-file state via globalThis.X assignments.

export function pageScriptsFor(_currentPage: string): string[] {
  return [];
}
