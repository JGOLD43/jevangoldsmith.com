import { test, expect } from '@playwright/test';

test('books page renders 122 SSR cards + counter', async ({ page }) => {
  await page.goto('/books.html', { waitUntil: 'domcontentloaded' });
  // Counter starts at 0 then settles after JS runs.
  await expect(page.locator('#book-count')).toHaveText(/^\d+$/, { timeout: 8000 });
  const counter = await page.locator('#book-count').innerText();
  expect(Number(counter)).toBeGreaterThanOrEqual(120);
  // Cards are SSR'd, so they're available before JS even runs.
  expect(await page.locator('.book-card').count()).toBeGreaterThanOrEqual(120);
});

test('books filter changes visible count', async ({ page }) => {
  await page.goto('/books.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => Number(document.getElementById('book-count')?.textContent || 0) > 100,
    null,
    { timeout: 8000 }
  );
  // Click the first non-"all" sidebar category.
  const filterBtn = page.locator('.sidebar-category[data-category="advertising"]');
  await filterBtn.click();
  // After filter, visible count should be lower than total.
  await page.waitForTimeout(500);
  const visibleCount = await page.locator('.book-card:not([style*="display: none"])').count();
  expect(visibleCount).toBeLessThan(122);
  expect(visibleCount).toBeGreaterThan(0);
});

test('books page has no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/books.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => Number(document.getElementById('book-count')?.textContent || 0) > 100,
    null,
    { timeout: 8000 }
  );
  // Some 3rd-party network errors are tolerated; only fail on script errors.
  const scriptErrors = errors.filter(
    (e) => !/Failed to load|net::ERR|favicon/i.test(e)
  );
  expect(scriptErrors).toEqual([]);
});
