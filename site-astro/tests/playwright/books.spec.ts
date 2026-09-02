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

test('compare shelves separates read, queued, and new books', async ({ page }) => {
  await page.goto('/books.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.book-stats-toggle').click();
  await page.locator('#bookshelf-comparison-tab').click();

  const comparison = page.locator('[data-bookshelf-source]:visible');
  await expect(comparison).toHaveCount(1);
  await expect(comparison.getByText('Read by you', { exact: true })).toBeVisible();
  await expect(comparison.getByText('Already to read', { exact: true })).toBeVisible();
  await expect(comparison.getByText('New discoveries', { exact: true })).toBeVisible();

  const switcher = page.locator('[data-bookshelf-switch]').nth(1);
  const sourceId = await switcher.getAttribute('data-bookshelf-switch');
  await switcher.click();
  await expect(page.locator('[data-bookshelf-source]:visible')).toHaveAttribute('data-bookshelf-source', sourceId || '');
});

test('reading-list builder saves named to-read lists on the device', async ({ page }) => {
  await page.goto('/books.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('jgold-reading-lists-v1'));
  await page.locator('.book-stats-toggle').click();
  await page.locator('#bookshelf-comparison-tab').click();

  const builder = page.locator('[data-bookshelf-source]:visible [data-list-builder]');
  await builder.locator('.bookshelf-pick').nth(0).click();
  await builder.locator('.bookshelf-pick').nth(1).click();
  await builder.locator('[data-list-name]').fill('Next from Andrew');
  await builder.locator('[data-save-list]').click();

  const saved = page.locator('.saved-list-card').first();
  await expect(saved.getByRole('heading', { name: 'Next from Andrew' })).toBeVisible();
  await expect(saved).toContainText('2 books');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.saved-list-card').first().getByRole('heading', { name: 'Next from Andrew' })).toBeVisible();
});
