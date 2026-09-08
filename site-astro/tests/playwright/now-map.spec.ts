import { test, expect } from '@playwright/test';


test('latest Now map link and marker use the published location and return to the latest update', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/now.html');
  const link = page.locator('#now-map-thumb-link');
  const lat = Number(await link.getAttribute('data-now-lat'));
  const lng = Number(await link.getAttribute('data-now-lng'));
  const label = (await page.locator('.now-map-thumb-label').innerText()).replace('LATEST LOCATION', '').trim();
  await link.click();
  await expect(page.locator('.adventures-page-split')).toHaveAttribute('data-now-lat', String(lat));
  await expect(page.locator('.adventures-page-split')).toHaveAttribute('data-now-lng', String(lng));
  await expect(page.locator('.now-marker.leaflet-marker-icon')).toBeVisible();
  await expect(page.locator('.now-popup-place')).toHaveText(label, { timeout: 30000 });
  await page.locator('.now-popup-btn').click();
  await expect(page.locator('#now-map-thumb-link')).toHaveAttribute('data-now-lat', String(lat));
  await expect(page.locator('#now-map-thumb-link')).toHaveAttribute('data-now-lng', String(lng));
});
