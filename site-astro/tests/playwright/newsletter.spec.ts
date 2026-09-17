import { test, expect } from '@playwright/test';

test('the main action leads to signup and the form fits a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const form = page.locator('#home-signup');
  await expect(form.getByRole('button', { name: 'Get my updates' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.navbar-contact-btn').click();
  await expect(page).toHaveURL(/newsletter\.html#newsletter-signup$/);
  await expect(page.locator('#newsletter-signup-email')).toBeVisible();
});

test('an unsuccessful provider payload preserves the address and never claims confirmation', async ({ page }) => {
  await page.route('https://formsubmit.co/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: 'false', message: 'not activated' }) }));
  await page.goto('/newsletter.html');
  await page.locator('#newsletter-signup-email').fill('reader@example.com');
  await page.locator('#newsletter-signup button').click();
  await expect(page.locator('#newsletter-signup-status')).toContainText('couldn’t confirm');
  await expect(page.locator('#newsletter-signup-email')).toHaveValue('reader@example.com');
  await expect(page.locator('#newsletter-signup button')).toBeEnabled();
  await expect(page.locator('[data-newsletter-status]')).toHaveCount(1);
});

test('a signup retains its discovery source and reports only verified delivery state', async ({ page }) => {
  let payload = '';
  await page.route('https://formsubmit.co/**', (route) => {
    payload = route.request().postData() || '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.goto('/?utm_source=linkedin&utm_medium=social&utm_campaign=monthly-launch&private_note=never-send-this');
  await page.locator('.navbar-contact-btn').click();
  await page.locator('#newsletter-signup-email').fill('reader@example.com');
  await page.locator('#newsletter-signup button').click();
  await expect(page.locator('#newsletter-signup-status')).toContainText('signup request has been sent');
  await expect(page.locator('#newsletter-signup-status')).toContainText('no automatic confirmation email');
  expect(payload).toContain('linkedin');
  expect(payload).toContain('monthly-launch');
  expect(payload).toContain('newsletter-page');
  expect(payload).not.toContain('never-send-this');
  expect(await page.evaluate(() => JSON.stringify(sessionStorage))).not.toContain('reader@example.com');
});

test('network errors keep signup recoverable', async ({ page }) => {
  await page.route('https://formsubmit.co/**', (route) => route.abort());
  await page.goto('/newsletter.html');
  await page.locator('#newsletter-signup-email').fill('reader@example.com');
  await page.locator('#newsletter-signup button').click();
  await expect(page.locator('#newsletter-signup-status')).toContainText('Please try again');
  await expect(page.locator('#newsletter-signup button')).toBeEnabled();
});

test('shared essays open directly and retain the newsletter invitation', async ({ page }) => {
  await page.goto('/essays.html#feed-my-addiction');
  await expect(page.locator('#essays-container')).toBeVisible();
  await expect(page.locator('#essays-container h2')).toHaveText('Feed My Addiction');
  await expect(page.locator('#essay-signup')).toBeVisible();
  await page.getByRole('button', { name: 'All essays', exact: true }).click();
  await expect(page.locator('#essays-cards')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
});

test('projects have a story and readers can try the newsletter and template', async ({ page, request }) => {
  await page.goto('/projects/personal-website.html');
  await expect(page.getByRole('heading', { name: 'Why it exists' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build notes' })).toBeVisible();
  await expect(page.locator('#project-signup')).toBeVisible();
  await page.goto('/updates/a-look-inside.html');
  await expect(page.getByRole('heading', { name: 'Something you can use' })).toBeVisible();
  await expect(page.locator('#update-signup')).toBeVisible();
  const template = await request.get('/downloads/weekly-review.md');
  expect(template.ok()).toBe(true);
  expect(await template.text()).toContain('What will I commit to?');
  const api = await request.get('/api/v1/newsletter.json');
  expect((await api.json()).items[0].frequency).toBe('Once a month');
});
