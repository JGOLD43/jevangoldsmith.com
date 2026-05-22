import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('../../../data/adventures.json', import.meta.url));
const adventuresData = JSON.parse(readFileSync(dataPath, 'utf8')) as { adventures?: Array<{ status?: string }> };
const expectedPublishedAdventures = (adventuresData.adventures || []).filter((adventure) => adventure.status === 'published').length;

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
