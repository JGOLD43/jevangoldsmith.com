import { test, expect } from '@playwright/test';

test('movies page renders SSR cards immediately', async ({ page }) => {
  await page.goto('/movies.html');
  // SSR'd cards available before any JS runs.
  expect(await page.locator('.movie-card').count()).toBeGreaterThanOrEqual(6);
});

test('movies SSR\'d cards are not wiped by hydration', async ({ page }) => {
  await page.goto('/movies.html');
  const initialIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.movie-card'))
      .map((c) => c.getAttribute('data-id'))
  );
  expect(initialIds.length).toBeGreaterThanOrEqual(6);
  await page.waitForLoadState('networkidle');
  const afterIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.movie-card'))
      .map((c) => c.getAttribute('data-id'))
  );
  // SSR'd ids survive (count may grow if Letterboxd RSS adds entries).
  for (const id of initialIds) {
    expect(afterIds).toContain(id);
  }
});
