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

test('opening a Shelf item near the footer keeps its scroll position and background', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/products.html');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Craftsman Boots' }).click();

  await expect(page.locator('body')).toHaveClass(/zoom-open/);
  await expect(page.locator('.site-footer')).toHaveCSS('visibility', 'hidden');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

  const expandedBounds = await page.locator('.shelf-item.is-zoom-target').evaluate((item) => {
    const image = item.querySelector('.shelf-object-photo')?.getBoundingClientRect();
    const detail = item.querySelector('.shelf-object-detail')?.getBoundingClientRect();
    return {
      imageTop: image?.top ?? -1,
      imageBottom: image?.bottom ?? Number.POSITIVE_INFINITY,
      detailTop: detail?.top ?? -1,
      detailBottom: detail?.bottom ?? Number.POSITIVE_INFINITY,
      viewportHeight: window.innerHeight,
    };
  });

  expect(expandedBounds.imageTop).toBeGreaterThanOrEqual(0);
  expect(expandedBounds.detailTop).toBeGreaterThanOrEqual(0);
  expect(expandedBounds.imageBottom).toBeLessThanOrEqual(expandedBounds.viewportHeight);
  expect(expandedBounds.detailBottom).toBeLessThanOrEqual(expandedBounds.viewportHeight);
});
