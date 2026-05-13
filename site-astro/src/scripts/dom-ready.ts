// Run a function once DOMContentLoaded fires (or immediately if it already
// has). Replaces the 5-line DOMContentLoaded check duplicated across 8 page
// scripts (books, letterboxd, essays, people, podcasts, cool-shit, projects,
// challenges) — Phase 12 round 3 consolidated them here.
//
// Use the async overload (default) when init may throw — the helper
// catches and logs without unhandled-promise warnings.

export function onDomReady(fn: () => void | Promise<void>, label = 'init'): void {
  const run = () => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.catch((error) => console.error(`Error in ${label}:`, error));
      }
    } catch (error) {
      console.error(`Error in ${label}:`, error);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
