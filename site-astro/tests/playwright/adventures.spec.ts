import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('../../../data/adventures.json', import.meta.url));
const adventuresData = JSON.parse(readFileSync(dataPath, 'utf8')) as { adventures?: Array<{ status?: string }> };
const expectedPublishedAdventures = (adventuresData.adventures || []).filter((adventure) => adventure.status === 'published').length;

for (const width of [390, 768, 769, 900, 968]) {
  test(`adventures list and map remain separate and readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => localStorage.setItem('adventures-sidebar-collapsed', '1'));
    await page.goto('/adventures.html');
    const sidebar = page.locator('.adventures-sidebar');
    const map = page.locator('.adventures-map-panel');
    const tabs = page.locator('.adventures-mobile-toggle');

    await expect(page.locator('#world-map')).toHaveClass(/leaflet-container/);
    await expect(map).toBeVisible();
    await expect(sidebar).toBeHidden();
    await tabs.locator('[data-view="list"]').click();
    await expect(sidebar.getByRole('heading', { name: 'Trips', exact: true })).toBeVisible();
    await expect(sidebar.locator('.adventures-filters')).toBeVisible();
    await expect(sidebar.locator('.adventure-compact-title:visible')).toHaveCount(expectedPublishedAdventures);
    await expect(sidebar.locator('#adventures-sidebar-toggle')).toBeHidden();
    await expect(map).toBeHidden();

    await sidebar.locator('.adventure-compact-card').first().click();
    await expect(page.locator('#adventure-story-inline')).toBeVisible();
    await expect(page.locator('#adventure-detail-overlay')).not.toHaveClass(/active/);
    await page.locator('[data-action="closeInlineStory"]').click();
    await tabs.locator('[data-view="map"]').click();
    await expect(sidebar).toBeHidden();
    await expect(map).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => {
      const panel = await map.boundingBox();
      const header = await page.locator('.navbar').boundingBox();
      const bar = await tabs.boundingBox();
      return Math.max(
        Math.abs(panel!.y - (header!.y + header!.height)),
        Math.abs(panel!.y + panel!.height - bar!.y),
      );
    }).toBeLessThanOrEqual(1);
  });
}

test('adventures preserves the selected tab while resizing between desktop and tablet', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/adventures.html');
  const sidebar = page.locator('.adventures-sidebar');
  const map = page.locator('.adventures-map-panel');
  const tabs = page.locator('.adventures-mobile-toggle');
  await expect(page.locator('#world-map')).toHaveClass(/leaflet-container/);
  await expect(sidebar).toBeVisible();
  await expect(map).toBeVisible();
  await sidebar.locator('#adventures-sidebar-toggle').click();
  await expect(page.locator('.adventures-page-split')).not.toHaveClass(/sidebar-collapsed/);

  await page.setViewportSize({ width: 900, height: 600 });
  await expect(sidebar).toBeHidden();
  await expect(map).toBeVisible();
  const panel = await map.boundingBox();
  const bar = await tabs.boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(bar!.y + 1);
  await tabs.locator('[data-view="list"]').click();

  await page.setViewportSize({ width: 969, height: 800 });
  await expect(tabs).toBeHidden();
  await expect(sidebar).toBeVisible();
  await expect(map).toBeVisible();
  await expect.poll(async () => {
    const rail = await sidebar.boundingBox();
    const panel = await map.boundingBox();
    return Math.abs(panel!.x - (rail!.x + rail!.width));
  }).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(sidebar.locator('.adventure-compact-title').first()).toBeVisible();
  await expect(map).toBeHidden();
  await expect(tabs.locator('[data-view="list"]')).toHaveClass(/active/);
});

test('adventures page renders published cards + counter', async ({ page }) => {
  await page.goto('/adventures.html');
  await page.waitForFunction(
    (expected) => Number(document.getElementById('adventure-count')?.textContent || 0) >= expected,
    expectedPublishedAdventures,
    { timeout: 10_000 }
  );
  const counter = await page.locator('#adventure-count').innerText();
  expect(Number(counter)).toBe(expectedPublishedAdventures);
});

// Skipped: window.AdventuresState was removed when adventures-state moved
// to ES module singletons (no longer leaks onto window). Test asserts a
// contract that no longer exists.
test.skip('adventures namespace surfaces are exposed on window', async ({ page }) => {
  await page.goto('/adventures.html');
  await page.waitForFunction(
    () => (window as any).AdventuresState != null,
    null,
    { timeout: 10_000 }
  );
  const state = await page.evaluate(() => ({
    hasState: typeof (window as any).AdventuresState,
    hasUrls: typeof (window as any).AdventuresUrls,
    hasConstants: typeof (window as any).AdventuresConstants,
    adventuresLen: (window as any).AdventuresState?.adventures?.length
  }));
  expect(state.hasState).toBe('object');
  expect(state.hasUrls).toBe('object');
  expect(state.hasConstants).toBe('object');
  expect(state.adventuresLen).toBe(7);
});

test('adventures sidebar toggle works', async ({ page }) => {
  await page.goto('/adventures.html');
  await page.waitForLoadState('domcontentloaded');
  const split = page.locator('.adventures-page-split');
  await expect(split).toBeAttached();
  const toggle = page.locator('#adventures-sidebar-toggle');
  if (await toggle.count() > 0) {
    const initialCollapsed = await split.evaluate((el) => el.classList.contains('sidebar-collapsed'));
    await toggle.click();
    await page.waitForTimeout(300);
    const afterCollapsed = await split.evaluate((el) => el.classList.contains('sidebar-collapsed'));
    expect(afterCollapsed).not.toBe(initialCollapsed);
  }
});

test('adventures thumbnails return to their compact size after closing the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('adventures-sidebar-collapsed', '1'));
  await page.goto('/adventures.html');

  const split = page.locator('.adventures-page-split');
  const toggle = page.locator('#adventures-sidebar-toggle');
  const firstThumbnail = page.locator('.adventure-compact-image').first();

  await expect(split).toHaveClass(/sidebar-collapsed/);
  await expect.poll(async () => Math.round((await firstThumbnail.boundingBox())?.width ?? 0)).toBe(72);

  await toggle.click();
  await expect(split).not.toHaveClass(/sidebar-collapsed/);
  await expect.poll(async () => Math.round((await firstThumbnail.boundingBox())?.width ?? 0)).toBeGreaterThan(72);

  await toggle.click();
  await expect(split).toHaveClass(/sidebar-collapsed/);
  await expect.poll(async () => Math.round((await firstThumbnail.boundingBox())?.width ?? 0)).toBe(72);
});
