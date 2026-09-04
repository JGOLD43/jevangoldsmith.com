import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), '../dist');

test('all published pages have consistent search metadata and canonical URLs', async ({ page }) => {
  const files = readdirSync(dist, { recursive: true }).map(String).filter((file) => file.endsWith('.html'));
  const documents = files.map((file) => ({ file, html: readFileSync(resolve(dist, file), 'utf8') }));
  const results = await page.evaluate((documents) => documents.map(({ file, html }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = (selector: string) => doc.querySelector(selector)?.getAttribute('content') || '';
    return {
      file,
      title: doc.title,
      description: meta('meta[name="description"]'),
      canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ogTitle: meta('meta[property="og:title"]'),
      twitterTitle: meta('meta[name="twitter:title"]'),
      noindex: meta('meta[name="robots"]').includes('noindex'),
      redirect: !!doc.querySelector('meta[http-equiv="refresh"]'),
      imagePreloads: Array.from(doc.querySelectorAll('link[rel="preload"][as="image"]')).map((link) => link.getAttribute('href') || ''),
    };
  }), documents);
  const titles = new Set<string>();
  const sitemap = new Set(Array.from(readFileSync(resolve(dist, 'sitemap-0.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]));
  for (const result of results) {
    if (result.noindex || result.redirect || result.file.startsWith('admin/')) {
      expect(sitemap.has(`https://jevangoldsmith.com/${result.file}`), `${result.file} should not be in the sitemap`).toBe(false);
      continue;
    }
    expect(result.title, result.file).toContain('Jevan Goldsmith');
    expect(titles.has(result.title), `duplicate title: ${result.file}`).toBe(false);
    titles.add(result.title);
    expect(result.description, result.file).not.toBe('');
    expect(result.ogTitle, result.file).toBe(result.title);
    expect(result.twitterTitle, result.file).toBe(result.title);
    const expected = `https://jevangoldsmith.com/${result.file === 'index.html' ? '' : result.file}`;
    expect(result.canonical, result.file).toBe(expected);
    if (result.file !== 'index.html') {
      expect(result.imagePreloads.filter((href) => href.includes('/profile/')), result.file).toEqual([]);
    }
    if (result.file !== 'now.html') {
      expect(result.imagePreloads.filter((href) => href.includes('/now-map')), result.file).toEqual([]);
    }
  }
  expect(titles.size).toBeGreaterThan(200);
});


test('nested pages keep links to root pages working', async ({ page }) => {
  await page.goto('/projects/personal-website.html');
  await expect(page.locator('.detail-link-pill').first()).toHaveAttribute('href', '/index.html');
  await page.goto('/projects/weekly-newsletter.html');
  await expect(page.locator('.detail-link-pill').first()).toHaveAttribute('href', '/newsletter.html');
  await page.goto('/now/archive.html');
  await expect(page.locator('.now-archive-section-text a[href="/books.html"]').first()).toBeAttached();
  await expect(page.locator('.now-archive-section-text a[href="/contact.html"]').first()).toBeAttached();
});
