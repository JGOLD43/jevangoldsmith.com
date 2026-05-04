import { test, expect } from '@playwright/test';

test('home page renders hero + nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1, .hero h2, .hero-title').first()).toBeVisible();
  // Nav links to the other pages we care about. Some are inside a
  // collapsed side-nav so we assert presence in the DOM, not visibility.
  await expect(page.locator('a[href="books.html"]').first()).toBeAttached();
  await expect(page.locator('a[href="adventures.html"]').first()).toBeAttached();
});

test('home page has no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});
