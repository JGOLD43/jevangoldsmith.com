import { test, expect } from '@playwright/test';

test('search returns multiple types for "naval"', async ({ page }) => {
  await page.goto('/search.html');
  const input = page.locator('#site-search-input');
  await expect(input).toBeVisible();
  await input.fill('naval');
  // Debounced search; wait for results.
  await page.waitForFunction(
    () => {
      const count = document.getElementById('site-search-count')?.textContent || '';
      return /\d+ result/i.test(count);
    },
    null,
    { timeout: 5000 }
  );
  const countText = await page.locator('#site-search-count').innerText();
  // Phase 8 sync added people + podcasts. 'naval' should hit ≥ 2 distinct types.
  expect(countText).toMatch(/^\d+\s*result/);
  const numResults = Number(countText.match(/^(\d+)/)?.[1] || 0);
  expect(numResults).toBeGreaterThanOrEqual(3);
});

test('search filter chips render with multiple types', async ({ page }) => {
  await page.goto('/search.html');
  // Filter chips render after the search index loads.
  await page.waitForFunction(
    () => document.querySelectorAll('#site-search-filters [data-search-type]').length > 5,
    null,
    { timeout: 5000 }
  );
  const types = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#site-search-filters [data-search-type]')).map((b) =>
      (b as HTMLElement).dataset.searchType
    )
  );
  // We added people + podcasts + movies in Phase 8 sync.
  for (const expected of ['people', 'podcasts', 'movies']) {
    expect(types).toContain(expected);
  }
});
