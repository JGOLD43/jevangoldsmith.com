import { test, expect } from '@playwright/test';

test('movies page renders SSR cards immediately', async ({ page }) => {
  await page.goto('/movies.html');
  // SSR'd cards available before any JS runs.
  expect(await page.locator('.movie-card').count()).toBeGreaterThanOrEqual(6);
});

test('movies load the first desktop row of cover images eagerly', async ({ page }) => {
  await page.goto('/movies.html');
  const loading = await page.locator('.movies-grid .movie-poster').evaluateAll((images) =>
    images.slice(0, 7).map((image) => ({
      loading: image.getAttribute('loading'),
      fetchPriority: image.getAttribute('fetchpriority')
    }))
  );

  expect(loading.slice(0, 6)).toEqual(
    Array.from({ length: 6 }, () => ({ loading: 'eager', fetchPriority: 'high' }))
  );
  expect(loading[6]).toEqual({ loading: 'lazy', fetchPriority: null });
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

test('movie tier badges stay inside their sidebar movie rows', async ({ page }) => {
  await page.goto('/movies.html');
  await page.waitForLoadState('networkidle');
  await page.locator('.sidebar-collapse-btn').click();

  const placement = await page.locator('.movie-link:has(.movie-search-tier-badge)').first().evaluate((link) => {
    const badge = link.querySelector<HTMLElement>('.movie-search-tier-badge');
    const linkRect = link.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    return {
      position: getComputedStyle(link).position,
      isOffsetParent: badge?.offsetParent === link,
      badgeTop: badgeRect?.top,
      badgeBottom: badgeRect?.bottom,
      linkTop: linkRect.top,
      linkBottom: linkRect.bottom
    };
  });

  expect(placement.position).toBe('relative');
  expect(placement.isOffsetParent).toBe(true);
  expect(placement.badgeTop).toBeGreaterThanOrEqual(placement.linkTop);
  expect(placement.badgeBottom).toBeLessThanOrEqual(placement.linkBottom);
});
