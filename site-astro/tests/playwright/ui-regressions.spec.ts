import { expect, test } from '@playwright/test';

test('Now is the only active top-level navigation item on the Now page', async ({ page }) => {
  await page.goto('/now.html');

  const activeLabels = await page.locator('.navbar .nav-links > li > a.active').allTextContents();
  expect(activeLabels.map((label) => label.trim())).toEqual(['Now']);
});

test('Thoughts, Taste and Experiences use balanced two-column dropdowns', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/books.html');

  const navLabels = await page.locator('.navbar .nav-links > li > a').allTextContents();
  expect(navLabels.map((label) => label.trim())).toContain('Experiences');
  expect(navLabels.map((label) => label.trim())).not.toContain('Ventures');

  const columnGeometry = async (triggerName: string) => {
    const dropdown = page.locator('.navbar .nav-dropdown').filter({ hasText: triggerName });
    await dropdown.hover();
    const columns = dropdown.locator('.dropdown-columns');
    await expect(columns).toBeVisible();
    await expect(dropdown.locator('.dropdown-wide-header')).toHaveCount(0);
    return columns.evaluate((element) => {
      const links = Array.from(element.querySelectorAll('a'));
      return {
        columns: new Set(links.map((link) => Math.round(link.getBoundingClientRect().left))).size,
        widths: links.map((link) => Math.round(link.getBoundingClientRect().width)),
      };
    });
  };

  for (const label of ['Thoughts', 'Taste', 'Experiences']) {
    const geometry = await columnGeometry(label);
    expect(geometry.columns).toBe(2);
    expect(new Set(geometry.widths).size).toBe(1);
  }
});

test('Experiences is active on its child pages', async ({ page }) => {
  await page.goto('/projects.html');
  await expect(page.locator('.navbar .dropdown-trigger.active')).toHaveText('Experiences');
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
