import { expect, test } from '@playwright/test';

test('Explore is the only active navigation item on the Now page', async ({ page }) => {
  await page.goto('/now.html');
  const labels = await page.locator('.navbar .nav-links > li > a.active').allTextContents();
  expect(labels.map((label) => label.trim())).toEqual(['Explore']);
});

test('writing navigation is direct and collections remain in Explore', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/books.html');
  expect((await page.locator('.navbar .nav-links > li > a').allTextContents()).map((label) => label.trim())).toEqual(['Essays', 'Start Here', 'About', 'Explore']);
  const dropdown = page.locator('.navbar .nav-dropdown');
  await dropdown.hover();
  await expect(dropdown.locator('.dropdown-columns')).toBeVisible();
  await expect(dropdown.getByRole('link', { name: 'Trips', exact: true })).toBeVisible();
  await expect(dropdown.getByRole('link', { name: 'Reading', exact: true })).toBeVisible();
  expect(await dropdown.locator('.dropdown-column').count()).toBe(2);
});

test('Explore remains active on project pages', async ({ page }) => {
  await page.goto('/projects.html');
  await expect(page.locator('.navbar .dropdown-trigger.active')).toHaveText('Explore');
  await expect(page.getByRole('navigation', { name: 'Experiences' })).toBeVisible();
});

for (const collection of [
  { name: 'Podcasts', path: '/podcasts.html', layout: '#podcasts-layout', toggle: '#podcasts-view-toggle', grid: '#podcasts-category-grid-view' },
  { name: 'People', path: '/people.html', layout: '#people-layout', toggle: '#people-view-toggle', grid: '#people-category-grid-view' },
]) {
  test(`${collection.name} collection mode fills the desktop content area`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(collection.path);
    await page.locator(collection.toggle).click();

    await expect(page.locator(collection.layout)).toHaveClass(/grid-view-active/);
    await expect.poll(async () => Math.round((await page.locator(collection.grid).boundingBox())?.width ?? 0)).toBeGreaterThan(900);
    await expect.poll(async () => Math.round((await page.locator(`${collection.grid} .category-card`).first().boundingBox())?.width ?? 0)).toBeGreaterThan(200);
  });
}

test('Shelf filter bar reveals the dotted page background without a divider', async ({ page }) => {
  await page.goto('/products.html');

  const chrome = await page.locator('.shelf-topbar').evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderBottomColor: style.borderBottomColor };
  });
  expect(chrome).toEqual({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderBottomColor: 'rgba(0, 0, 0, 0)',
  });
});
