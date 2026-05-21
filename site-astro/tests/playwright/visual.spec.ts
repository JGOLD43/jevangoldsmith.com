import { test, expect } from '@playwright/test';

// Visual diff harness. Captures full-page screenshots of the 8 highest-
// traffic routes at desktop, tablet, and mobile viewports and compares
// against stored baselines.
//
// Re-capture baselines with: UPDATE_SNAPSHOTS=1 npm run test:browser
//
// The threshold is intentionally permissive (15% pixel-diff allowed) so
// font subpixel rendering + small icon rasterization differences across
// machines don't false-positive. A breaking visual change (chrome
// refactor that loses an element) would still trip a 15% diff.

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

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
];

for (const viewport of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`visual ${viewport.name} ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Disable animations + transitions for deterministic capture.
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
          }
        `
      });
      // Give the page a moment to settle after the style injection.
      await page.waitForTimeout(300);
      const base = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\.html$/, '');
      const name = `${base}-${viewport.name}.png`;
      await expect(page).toHaveScreenshot(name, {
        fullPage: true,
        maxDiffPixelRatio: 0.15
      });
    });
  }
}
