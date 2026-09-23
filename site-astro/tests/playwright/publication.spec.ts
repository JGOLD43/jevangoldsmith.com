import { test, expect } from '@playwright/test';

const essays = [
  ['feed-my-addiction', 'Feed My Addiction'],
  ['beginning-end', 'The Beginning is the End and the End is the Beginning'],
  ['hot-spas', 'Hot Spas Never go out of Style - A lesson on Culture'],
];
for (const [id, title] of essays) {
  test(`${id} is a readable standalone page with unique sharing metadata`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto(`/essays/${id}.html`);
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.locator('.essay-body')).toBeVisible();
    const canonical = `https://jevangoldsmith.com/essays/${id}.html`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('.navbar a[aria-current="page"]')).toHaveText('Essays');
    await expect(page.getByRole('heading', { name: 'Read next' })).toBeVisible();
    await context.close();
  });
  test(`${id} legacy fragment preserves campaign attribution`, async ({ page }) => {
    await page.goto(`/essays.html?utm_source=reader#${id}`);
    await expect(page).toHaveURL(new RegExp(`/essays/${id}\\.html\\?utm_source=reader$`));
  });
}

test('RSS, API, search and sitemap point to the standalone essays', async ({ request }) => {
  const rss = await (await request.get('/rss.xml')).text();
  const api = await (await request.get('/api/v1/essays.json')).json();
  const index = await (await request.get('/api/v1/search-index.json')).json();
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const [id, title] of essays) {
    const url = `https://jevangoldsmith.com/essays/${id}.html`;
    expect(rss).toContain(url);
    expect(api.items.find((item: any) => item.id === id).canonicalUrl).toBe(url);
    expect((index.records || index).find((item: any) => item.type === 'essays' && item.title === title).url).toBe(url);
    expect(sitemap).toContain(url);
    const image = await request.get(`/images/essays/${id}.png`);
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
  }
});

test('unknown fragments stay on the useful essay archive', async ({ page }) => {
  await page.goto('/essays.html#unknown-essay');
  await expect(page.locator('#essays-list')).toBeVisible();
  await expect(page).toHaveURL(/essays\.html#unknown-essay$/);
});

test('work mode features writing and personal mode keeps the portrait', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.featured-essay')).toBeVisible();
  await expect(page.locator('.publication-portrait')).toBeHidden();
  await page.locator('.work-mode-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'personal');
  await expect(page.locator('.publication-portrait')).toHaveCount(1);
  await expect(page.locator('.publication-portrait')).toBeVisible();
  await expect(page.locator('.featured-essay')).toBeHidden();
});

test('mobile readers can navigate, read and subscribe without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.mobile-menu-toggle').click();
  await page.locator('.nav-links').getByRole('link', { name: 'Essays', exact: true }).click();
  await page.locator('#essays-list h2 a').first().click();
  await expect(page.locator('.essay-body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#essay-signup').scrollIntoViewIfNeeded();
  await expect(page.locator('#essay-signup button')).toHaveText('Subscribe');
});
