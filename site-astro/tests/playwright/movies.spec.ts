import { test, expect } from '@playwright/test';

test('movies page renders SSR cards immediately', async ({ page }) => {
  await page.goto('/movies.html');
  // SSR'd cards available before any JS runs.
  expect(await page.locator('.movie-card').count()).toBeGreaterThanOrEqual(6);
});

test('movies retain one valid grid item per SSR card after hydration', async ({ page }) => {
  await page.goto('/movies.html');
  const initialTitles = await page.locator('#movies-container > .movie-card').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-movie-title'))
  );
  expect(initialTitles.length).toBeGreaterThanOrEqual(6);
  await page.waitForLoadState('networkidle');
  const hydrated = await page.evaluate(() => {
    const grid = document.getElementById('movies-container');
    const cards = Array.from(grid?.querySelectorAll(':scope > .movie-card') ?? []);
    return {
      cardCount: cards.length,
      childCount: grid?.children.length ?? 0,
      nestedLinks: cards.some((card) => card.querySelector('a a') !== null)
    };
  });
  expect(hydrated.cardCount).toBe(initialTitles.length);
  expect(hydrated.childCount).toBe(initialTitles.length);
  expect(hydrated.nestedLinks).toBe(false);
});
