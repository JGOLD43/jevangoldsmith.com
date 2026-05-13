import { test, expect } from '@playwright/test';

// Phase 3 slice 3.1 (Tier 1+2 plan): map-mount Playwright spec.
//
// The adventures map is dynamically imported via `import('./adventures-map.js')`
// from adventures.js, then leaflet bootstraps + creates `.leaflet-container`.
// Markers + route polylines are added once `mapDataPromise` resolves.

test('adventures map mounts leaflet container + markers', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/adventures.html');

  await page.waitForFunction(
    () => (window as any).AdventuresState?.adventures?.length >= 1,
    null,
    { timeout: 10_000 }
  );

  await page.dispatchEvent('#world-map', 'pointerenter');
  await page.waitForSelector('.leaflet-container', { timeout: 25_000 });

  // Once the container is in the DOM, markers should be added once the
  // map data fetch resolves. Adventures has 7 markers (one per
  // adventure with mapCenter coords).
  await page.waitForFunction(
    () => document.querySelectorAll('.leaflet-marker-icon').length >= 1,
    null,
    { timeout: 15_000 }
  );

  const markerCount = await page.locator('.leaflet-marker-icon').count();
  expect(markerCount).toBeGreaterThanOrEqual(1);
});

test('adventures map renders place + adventure markers', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/adventures.html');

  await page.dispatchEvent('#world-map', 'pointerenter');
  await page.waitForSelector('.leaflet-container', { timeout: 25_000 });

  // The map runtime renders place-of-interest markers + per-adventure
  // markers + photo markers. We expect well over 10 — at the time of
  // writing the dist has 543. Assert ≥ 10 to allow for content changes.
  await page.waitForFunction(
    () => document.querySelectorAll('.leaflet-marker-icon').length >= 10,
    null,
    { timeout: 15_000 }
  );
  const count = await page.locator('.leaflet-marker-icon').count();
  expect(count).toBeGreaterThanOrEqual(10);
});

test('adventures world-map element exists in SSR HTML', async ({ page }) => {
  await page.goto('/adventures.html');
  await expect(page.locator('#world-map')).toBeAttached();
  await expect(page.locator('.adventures-main-map')).toBeAttached();
});
