// Coverage spec for routes/behaviors not exercised by interactions.spec.js
// or smoke.spec.js. Used as the safety net during the 11ty migration.

const { test, expect } = require('@playwright/test');

test('home renders hero, social links, and at least one section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero h1.hero-headline')).toBeVisible();
  await expect(page.locator('.hero-social-links a').first()).toBeVisible();
  await expect(page.locator('main, body section').first()).toBeVisible();
});

test('theme toggle flips data-theme and persists in jg-theme', async ({ page }) => {
  await page.goto('/');
  const initial = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme') || 'light'
  );
  await page.locator('.theme-toggle').first().click();
  const expected = initial === 'dark' ? 'light' : 'dark';
  await expect.poll(async () =>
    page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  ).toBe(expected);
  const stored = await page.evaluate(() => localStorage.getItem('jg-theme'));
  expect(stored).toBe(expected);
});

test('cool-shit page renders item cards', async ({ page }) => {
  await page.goto('/cool-shit.html');
  await expect(page.locator('.cool-page, .cool-feed, main').first()).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
});

test('quotes page renders quote cards', async ({ page }) => {
  await page.goto('/quotes.html');
  await expect(page.locator('h1')).toContainText(/Words|Quotes|Thinking/i);
  await expect(page.locator('.quote-card, .quote, blockquote').first()).toBeVisible();
});

test('important-or-not page renders narrative chrome and SEO meta', async ({ page }) => {
  await page.goto('/important-or-not.html');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /important-or-not\.html$/
  );
});

test('field-notes page renders signup form', async ({ page }) => {
  await page.goto('/field-notes.html');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.field-notes-form, form').first()).toBeVisible();
});

test('search page accepts query input', async ({ page }) => {
  await page.goto('/search.html');
  const input = page.locator('input[type="search"], #search-input, input[name="q"]').first();
  await expect(input).toBeVisible();
  await input.fill('books');
});

test('contact page exposes contact information', async ({ page }) => {
  await page.goto('/contact.html');
  await expect(page.locator('h1')).toContainText(/Get in Touch|Contact/i);
  await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute(
    'href',
    /mailto:hello@/
  );
});

test('movies cards render from data', async ({ page }) => {
  await page.goto('/movies.html');
  await expect(page.locator('.movie-card').first()).toBeVisible();
  const count = await page.locator('.movie-card').count();
  expect(count).toBeGreaterThan(2);
});

test('books cards render from data and modal exists in DOM', async ({ page }) => {
  await page.goto('/books.html');
  await expect(page.locator('.book-card').first()).toBeVisible();
  await expect(page.locator('#book-modal')).toHaveCount(1);
});

test('podcasts list page renders podcast or show cards', async ({ page }) => {
  await page.goto('/podcasts.html');
  await expect(page.locator('.podcast-card, .show-card, .podcast-item').first()).toBeVisible();
});

test('people page lists multiple cards from data', async ({ page }) => {
  await page.goto('/people.html');
  await expect(page.locator('.person-card').first()).toBeVisible();
  const count = await page.locator('.person-card').count();
  expect(count).toBeGreaterThan(2);
});

test('topic page renders headings and related links', async ({ page }) => {
  await page.goto('/topics/better-thinking.html');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a').first()).toBeVisible();
});

test('sitemap.xml is reachable and contains real urls', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBeTruthy();
  const text = await res.text();
  expect(text).toContain('<urlset');
  expect(text.match(/<loc>/g)?.length || 0).toBeGreaterThan(10);
});

test('robots.txt is reachable and points at sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.ok()).toBeTruthy();
  const text = await res.text();
  expect(text.toLowerCase()).toContain('sitemap');
});

test('llms.txt is reachable and non-empty', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.ok()).toBeTruthy();
  const text = await res.text();
  expect(text.length).toBeGreaterThan(100);
});

test('no obvious 404s on top nav links from home', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('nav a[href]', (as) =>
    as
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && !h.startsWith('http') && !h.startsWith('mailto:') && !h.startsWith('#') && !h.startsWith('tel:'))
  );
  const seen = new Set();
  for (const href of hrefs) {
    const cleaned = href.split('#')[0].split('?')[0];
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    const url = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    const res = await request.get(url);
    expect(res.status(), `nav link broken: ${url}`).toBeLessThan(400);
  }
});
