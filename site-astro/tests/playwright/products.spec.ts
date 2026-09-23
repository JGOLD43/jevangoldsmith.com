import { expect, test } from '@playwright/test';

test('Shelf navigation keeps its compact typography and spacing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/products.html');
  const shelfHeader = page.locator('.shelf-topbar');
  const shelfRail = page.locator('.shelf-filter');
  const shelfButton = shelfRail.locator('button').first();

  await expect(shelfHeader).toHaveCSS('font-family', /JetBrains Mono/);
  await expect(shelfHeader).toHaveCSS('padding', '18px 32px');
  await expect(shelfHeader).toHaveCSS('gap', '24px');
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
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/products.html');

  const cards = page.locator('[data-shelf-card]');
  await expect(cards.locator('.shelf-object-name--general')).toHaveText(['Laptop', 'Phone', 'Camera', 'Boots']);
  expect(await cards.locator('.shelf-object-name--specific').evaluateAll((labels) =>
    labels.every((label) => getComputedStyle(label).display === 'none'),
  )).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await cards.evaluateAll((items) => Promise.all(items.flatMap((item) => item.getAnimations().map((animation) => animation.finished))));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  expect(scrollBeforeOpen).toBeGreaterThan(0);
  // Click the visible photo directly: locator.click() scrolls the entire
  // button into view first, changing the very scroll position being tested.
  const photo = await page.getByRole('button', { name: 'Boots' }).locator('.shelf-object-photo').boundingBox();
  expect(photo).not.toBeNull();
  const clickY = photo!.y + photo!.height / 2;
  expect(clickY).toBeGreaterThan(0);
  expect(clickY).toBeLessThan(800);
  await page.mouse.click(photo!.x + photo!.width / 2, clickY);

  await expect(page.locator('body')).toHaveClass(/zoom-open/);
  await expect(page.locator('.site-footer')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('.shelf-page')).toHaveClass(/shelf-zoom-layout/);
  await expect(page.locator('.shelf-item.is-zoom-target .shelf-object-name--general')).toBeHidden();
  await expect(page.locator('.shelf-item.is-zoom-target .shelf-object-name--specific')).toHaveText('Craftsman Boots');
  await expect(page.locator('.shelf-item.is-zoom-target .shelf-object-name--specific')).toBeVisible();
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

  await expect.poll(() => page.locator('.shelf-item.is-zoom-target').evaluate((item) => {
    const contentBottom = Math.max(item.getBoundingClientRect().bottom,
      ...Array.from(item.querySelectorAll('.shelf-object-photo, .shelf-object-detail')).map((element) => element.getBoundingClientRect().bottom));
    return document.querySelector('.site-footer')!.getBoundingClientRect().top - contentBottom;
  })).toBeGreaterThan(0);
  const backgroundJoinsFooter = await page.locator('.shelf-page').evaluate((shelf) =>
    Math.abs(shelf.getBoundingClientRect().bottom - document.querySelector('.site-footer')!.getBoundingClientRect().top) < 1,
  );
  expect(backgroundJoinsFooter).toBe(true);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.site-footer').getByRole('link', { name: 'The Shelf', exact: true })).toBeInViewport();
  await expect(page.locator('body')).toHaveClass(/zoom-open/);
});

test('expanded Shelf details are vertically centred with the selected object', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.goto('/products.html');
  await page.getByRole('button', { name: 'Camera' }).click();

  const centres = await page.locator('.shelf-item.is-zoom-target').evaluate((item) => {
    const stage = item.querySelector('.shelf-object-stage')?.getBoundingClientRect();
    const detail = item.querySelector('.shelf-object-detail')?.getBoundingClientRect();
    return {
      stage: stage ? (stage.top + stage.bottom) / 2 : -1,
      detail: detail ? (detail.top + detail.bottom) / 2 : -1,
    };
  });

  expect(Math.abs(centres.stage - centres.detail)).toBeLessThan(20);
});

test('Shelf navigation returns as soon as an item starts closing', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products.html');
    await page.getByRole('button', { name: 'Laptop', exact: true }).click();
    await expect(page.locator('.shelf-topbar')).toBeHidden();

    // Inspect the same event turn so auto-waiting cannot mask a delayed return.
    const closing = await page.evaluate(() => {
      const back = document.querySelector<HTMLButtonElement>('.shelf-back')!;
      if (window.innerWidth <= 760) back.click();
      else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return {
        navigation: getComputedStyle(document.querySelector('.shelf-topbar')!).visibility,
        backVisible: getComputedStyle(back).display !== 'none' && getComputedStyle(back).visibility === 'visible',
        animating: document.querySelector('.shelf-page')!.classList.contains('shelf-zoom-layout'),
      };
    });

    expect(closing).toEqual({ navigation: 'visible', backVisible: false, animating: true });
    await expect(page.locator('.shelf-page')).not.toHaveClass(/shelf-zoom-layout/);
  }
});
