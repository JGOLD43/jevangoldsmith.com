import { expect, test } from '@playwright/test';

test('Shelf navigation matches the Interests navigation layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/cool-shit.html');
  const interestsHeaderHeight = await page.locator('.wall-topbar').evaluate((element) =>
    Math.round(element.getBoundingClientRect().height),
  );

  await page.goto('/products.html');
  const shelfHeader = page.locator('.shelf-topbar');
  const shelfRail = page.locator('.shelf-filter');
  const shelfButton = shelfRail.locator('button').first();
  const shelfHeaderHeight = await shelfHeader.evaluate((element) =>
    Math.round(element.getBoundingClientRect().height),
  );

  await expect(shelfHeader).toHaveCSS('font-family', /JetBrains Mono/);
  expect(shelfHeaderHeight).toBe(interestsHeaderHeight);
  await expect(shelfRail).toHaveCSS('max-width', 'none');
  await expect(shelfRail).toHaveCSS('margin-bottom', '0px');
  await expect(shelfRail).toHaveCSS('justify-content', 'normal');
  await expect(shelfButton).toHaveCSS('font-weight', '600');
  await expect(shelfButton).toHaveCSS('text-transform', 'none');
  await expect(shelfButton).toHaveCSS('min-height', 'auto');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products.html');
  await expect(page.locator('.shelf-topbar')).toHaveCSS('align-items', 'center');
});
