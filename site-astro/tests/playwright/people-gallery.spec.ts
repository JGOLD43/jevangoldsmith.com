import { test, expect } from '@playwright/test';

const gallery = '#people-gallery';
const collection = '#people-grid .person-card';

test('portrait wall opens from the people collection and returns focus on exit', async ({ page }) => {
  await page.goto('/people.html');
  const total = await page.locator(collection).count();
  expect(total).toBeGreaterThan(0);
  const entry = page.locator('[data-open-people-gallery]');
  await entry.click();
  await expect(page.locator(gallery)).toBeVisible();
  await expect(page).toHaveURL(/view=gallery/);
  await expect(page.locator('.pg-portrait')).toHaveCount(total);
  await expect(page.locator(`${gallery} canvas`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to all people' }).click();
  await expect(page.locator(gallery)).not.toBeVisible();
  await expect(page).not.toHaveURL(/view=gallery/);
  await expect(entry).toBeFocused();
});

test('mouse wheel, keyboard, and position slider browse the same wall', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/people.html?view=gallery');
  const total = await page.locator(collection).count();
  await expect(page.locator(gallery)).toHaveAttribute('data-portrait', '0');
  await page.getByRole('button', { name: 'Next portrait', exact: true }).click();
  await expect(page.locator(gallery)).toHaveAttribute('data-portrait', '1');
  await page.locator('[data-gallery-wall]').hover({ position: { x: 300, y: 300 } });
  await page.mouse.wheel(0, 550);
  await expect.poll(() => page.locator(gallery).getAttribute('data-portrait')).not.toBe('1');
  await page.keyboard.press('End');
  await expect(page.locator(gallery)).toHaveAttribute('data-portrait', String(total - 1));
  await expect(page.getByRole('button', { name: 'Next portrait', exact: true })).toBeDisabled();
  await page.getByRole('slider').focus();
  await page.keyboard.press('Home');
  await expect(page.locator(gallery)).toHaveAttribute('data-portrait', '0');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(gallery)).toHaveAttribute('data-portrait', '1');
});

test('rooms, search, empty results, and portrait details stay connected', async ({ page }) => {
  await page.goto('/people.html?view=gallery');
  const total = await page.locator(collection).count();
  const scientists = await page.locator(`${collection}[data-category="science"]`).count();
  await page.getByLabel('Gallery room', { exact: true }).selectOption('science');
  await expect(page.locator('.pg-portrait')).toHaveCount(scientists);
  await page.getByRole('button', { name: 'Find a person', exact: true }).click();
  await page.getByRole('searchbox').fill('Feynman');
  await expect(page.locator('.pg-portrait')).toHaveCount(1);
  await page.locator('.pg-search-result').click();
  await expect(page.locator('[data-gallery-detail]')).toBeVisible();
  await expect(page.locator('#pg-detail-name')).toHaveText('Richard Feynman');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-gallery-detail]')).not.toBeVisible();
  await expect(page.locator(gallery)).toBeVisible();
  await page.getByRole('button', { name: 'Find a person', exact: true }).click();
  await page.getByRole('searchbox').fill('no-matching-person-123');
  await expect(page.locator('[data-gallery-empty]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pg-search-panel')).not.toBeVisible();
  await expect(page.locator(gallery)).toBeVisible();
  await page.getByRole('button', { name: 'Show all people', exact: true }).click();
  await expect(page.locator('.pg-portrait')).toHaveCount(total);
  await expect(page.locator('[data-gallery-empty]')).not.toBeVisible();
});

for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`portraits and controls fit ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/people.html?view=gallery');
    await expect(page.locator(gallery)).toHaveAttribute('data-gallery-state', 'ready');
    const frame = await page.locator('.pg-frame').first().boundingBox();
    const title = await page.locator('.pg-plaque').first().boundingBox();
    const footer = await page.locator('.pg-browse-controls').boundingBox();
    expect(frame).not.toBeNull(); expect(title).not.toBeNull(); expect(footer).not.toBeNull();
    expect(frame!.x).toBeGreaterThanOrEqual(0);
    expect(frame!.x + frame!.width).toBeLessThanOrEqual(viewport.width);
    expect(title!.y + title!.height).toBeLessThan(footer!.y);
    const captionBand = await page.evaluate(() => ({
      captionBottom: Math.max(...Array.from(document.querySelectorAll('.pg-plaque'), el => el.getBoundingClientRect().bottom)),
      furnitureTop: Math.min(...Array.from(document.querySelectorAll('.pg-furniture'), el => el.getBoundingClientRect().top))
    }));
    expect(captionBand.captionBottom).toBeLessThan(captionBand.furnitureTop);
    await expect(page.getByRole('button', { name: 'Next portrait', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Return to all people' })).toBeInViewport();
    await page.getByRole('button', { name: 'Explore David Ogilvy', exact: true }).click();
    await expect(page.locator('#pg-detail-name')).toHaveText('David Ogilvy');
    await page.getByRole('button', { name: 'Back to the gallery' }).click();
    await expect(page.locator(gallery)).toBeVisible();
  });
}

test('a mouse drag moves the wall without opening a portrait', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/people.html?view=gallery');
  const total = await page.locator(collection).count();
  await expect(page.locator('.pg-portrait')).toHaveCount(total);
  await page.mouse.move(295, 400);
  await page.mouse.down();
  await page.mouse.move(60, 400, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('[data-gallery-detail]')).not.toBeVisible();
  await expect.poll(() => page.locator('[data-gallery-wall]').evaluate(el => el.scrollLeft)).toBeGreaterThan(150);
});

test('carpet and floor move with the wall and the branding stays out of view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/people.html?view=gallery');
  await expect(page.locator(gallery)).toHaveAttribute('data-gallery-state', 'ready');
  await expect(page.locator(`${gallery} .pg-identity`)).toHaveCount(0);
  const before = await page.locator('.pg-carpet').boundingBox();
  await page.getByRole('button', { name: 'Next portrait', exact: true }).click();
  await expect(page.locator(gallery)).toHaveAttribute('data-portrait', '1');
  const after = await page.locator('.pg-carpet').boundingBox();
  const distance = await page.locator('[data-gallery-wall]').evaluate(el => el.scrollLeft);
  expect(before!.x - after!.x).toBeCloseTo(distance, 0);
  expect(after!.width).toBeGreaterThan(page.viewportSize()!.width);
});
