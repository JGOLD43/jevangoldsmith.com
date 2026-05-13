import { test, expect } from '@playwright/test';

test('adventures page renders 7 cards + counter', async ({ page }) => {
  await page.goto('/adventures.html');
  await page.waitForFunction(
    () => Number(document.getElementById('adventure-count')?.textContent || 0) >= 7,
    null,
    { timeout: 10_000 }
  );
  const counter = await page.locator('#adventure-count').innerText();
  expect(Number(counter)).toBe(7);
});

test('adventures namespace surfaces are exposed on window', async ({ page }) => {
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
