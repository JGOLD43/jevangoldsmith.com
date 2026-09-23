import { expect, test } from '@playwright/test';

test('interest filters show the matching notes and reset accessibly', async ({ page, request }) => {
  await page.goto('/cool-shit.html');
  const cards = page.locator('.interest-card:visible');
  await expect(cards).toHaveCount(12);
  for (const link of await cards.getByRole('link').all()) {
    const response = await request.get((await link.getAttribute('href'))!);
    expect(response.ok()).toBe(true);
  }
  const rail = page.getByRole('navigation', { name: 'Filter interests' });
  for (const [label, count] of [['Building', 3], ['Thinking', 3], ['Reading', 2], ['Technology', 2], ['Writing', 1], ['Adventure', 1]] as const) {
    const filter = rail.getByRole('button', { name: new RegExp(`^${label}`) });
    await filter.click();
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(count);
    await expect(cards.locator('.interest-meta > span:first-child')).toHaveText(Array(count).fill(label));
    await expect(page.locator('#feed-count')).toHaveText(`${count} interest${count === 1 ? '' : 's'}`);
  }
  await rail.getByRole('button', { name: /^All/ }).focus();
  await page.keyboard.press('Enter');
  await expect(cards).toHaveCount(12);
});

test('interest notes remain readable on mobile in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cool-shit.html');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const card of await page.locator('.interest-card').all()) {
      await expect(card.locator('.interest-body')).toBeVisible();
      await expect(card.getByRole('link')).toBeVisible();
      expect(await card.evaluate(el => el.scrollHeight <= el.clientHeight + 2)).toBe(true);
    }
  }
});
