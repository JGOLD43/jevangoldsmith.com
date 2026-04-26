const { test, expect } = require('@playwright/test');

test('books sidebar links scroll to card and activate link state', async ({ page }) => {
  await page.goto('/books.html');
  await page.locator('[data-action="toggle-sidebar"]').click();
  await page.locator('.sidebar-category[data-category="learning"]').click();
  const firstBookLink = page.locator('#category-learning .book-link').first();
  await expect(firstBookLink).toBeVisible();
  await firstBookLink.click();
  await expect(firstBookLink).toHaveClass(/active/);
});

test('search sanitizes unsafe result URLs', async ({ page }) => {
  await page.route('**/api/v1/search-index.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        records: [
          {
            title: 'Unsafe Link Test',
            summary: 'Should never render javascript href',
            section: 'test',
            type: 'page',
            tags: [],
            url: 'javascript:alert(1)'
          }
        ]
      })
    });
  });

  await page.goto('/search.html');
  const result = page.locator('.search-result-card').first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', '#');
});

test('adventures card opens detail overlay', async ({ page }) => {
  await page.goto('/adventures.html');
  const firstCard = page.locator('.adventure-compact-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await expect(page.locator('#adventure-detail-overlay')).toHaveClass(/active/);
});
