const { test, expect } = require('@playwright/test');

const pages = [
  { path: '/', chrome: 'shared' },
  { path: '/books.html', chrome: 'shared' },
  { path: '/essays.html', chrome: 'shared' },
  { path: '/adventures.html', chrome: 'shared' },
  { path: '/people.html', chrome: 'shared' },
  { path: '/products.html', chrome: 'shared' },
  { path: '/meet.html', chrome: 'minimal' },
  { path: '/adventure-japan-adventure.html', chrome: 'shared' },
  { path: '/topics/better-thinking.html', chrome: 'shared' }
];

for (const { path, chrome } of pages) {
  test(`${path} renders core chrome`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
    if (chrome === 'minimal') {
      await expect(page.locator('header.meet-header')).toBeVisible();
    } else {
      await expect(page.locator('nav.navbar')).toBeVisible();
    }
    await expect(page.locator('main, header, section').first()).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  });
}

test('agent API exposes ingestible JSON', async ({ request }) => {
  const response = await request.get('/api/v1/index.json');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.endpoints.pages).toContain('/api/v1/pages.json');
  expect(body.guidance.preferredIngestion).toContain('JSON');
});
