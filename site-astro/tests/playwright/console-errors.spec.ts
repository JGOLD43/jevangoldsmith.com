import { test, expect } from '@playwright/test';

// Phase 4 slice 4.1 (Tier 1+2 plan): console-error guard. Fails if any
// of the 8 baseline routes emits a script-level error matching common
// "X is not defined / undefined is not a function / Cannot read..." patterns.

const ROUTES = [
  '/',
  '/books.html',
  '/movies.html',
  '/people.html',
  '/adventures.html',
  '/podcasts.html',
  '/essays.html',
  '/search.html'
];

// Network/CDN failures that aren't site bugs — tolerate.
const TOLERATED = [
  /Failed to load|net::ERR/i,
  /favicon/i,
  /allorigins\.win/i, // Letterboxd CORS proxy can be flaky
  /youtube/i, // YouTube embed/RSS sometimes blocked
  /letterboxd/i
];

const FATAL_PATTERNS = [
  /is not defined/i,
  /is not a function/i,
  /Cannot read prop/i,
  /Cannot read properties/i,
  /undefined is not/i,
  /null is not/i
];

for (const route of ROUTES) {
  test(`no script-level console errors on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    // Settle time for runtime fetches.
    await page.waitForTimeout(1500);

    const fatal = errors.filter((e) =>
      FATAL_PATTERNS.some((p) => p.test(e)) &&
      !TOLERATED.some((p) => p.test(e))
    );
    expect(fatal, `${route} fatal errors:\n  ${fatal.join('\n  ')}`).toEqual([]);
  });
}
