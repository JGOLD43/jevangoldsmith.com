import { test, expect } from '@playwright/test';

test('people page renders person cards', async ({ page }) => {
  await page.goto('/people.html');
  // Wait for the hydrated cards (mergeBookPeople pushes count to ~98).
  await page.waitForFunction(
    () => document.querySelectorAll('.person-card').length >= 90,
    null,
    { timeout: 10_000 }
  );
  const counter = await page.locator('#people-count').innerText();
  expect(Number(counter)).toBeGreaterThanOrEqual(90);
});

test('people SSR\'d cards survive runtime hydration (no wipe)', async ({ page }) => {
  await page.goto('/people.html');
  // Snapshot the IDs of SSR'd cards before client JS hydrates.
  const initialIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.person-card'))
      .map((c) => c.getAttribute('data-person-id'))
      .filter(Boolean)
  );
  expect(initialIds.length).toBeGreaterThanOrEqual(10);
  // Wait for hydration to add more cards.
  await page.waitForFunction(
    () => document.querySelectorAll('.person-card').length >= 90,
    null,
    { timeout: 10_000 }
  );
  // Verify the original SSR IDs are still in the DOM (not wiped).
  const afterIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.person-card'))
      .map((c) => c.getAttribute('data-person-id'))
      .filter(Boolean)
  );
  for (const id of initialIds) {
    expect(afterIds).toContain(id);
  }
});

test('people filter changes visible count', async ({ page }) => {
  await page.goto('/people.html');
  await page.waitForFunction(
    () => document.querySelectorAll('.person-card').length >= 90,
    null,
    { timeout: 10_000 }
  );
  // Pick a non-"all" category sidebar button.
  const businessBtn = page.locator('.sidebar-category[data-action-args="business"]').first();
  await businessBtn.click();
  await page.waitForTimeout(500);
  const visible = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.person-card')).filter(
      (c) => (c as HTMLElement).style.display !== 'none'
    ).length;
  });
  expect(visible).toBeLessThan(90);
  expect(visible).toBeGreaterThan(0);
});
