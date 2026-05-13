import { test, expect } from '@playwright/test';

// Phase 3 slice 3.2 (Tier 1+2 plan): detail-pane open + close path test.

test('adventures detail overlay opens on card click', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/adventures.html');
  await page.waitForFunction(
    () => (window as any).AdventuresState?.adventures?.length >= 1,
    null,
    { timeout: 10_000 }
  );

  // Click the first card (action-dispatcher resolves data-action attribute).
  // The list is rendered after AdventuresState populates — give it a beat
  // so the action handlers are bound before clicking.
  await page.waitForSelector('[data-adventure-id]', { timeout: 10_000 });
  await page.waitForTimeout(300);
  const firstCard = page.locator('[data-adventure-id]').first();
  await firstCard.click();

  // Overlay shown (it has class is-active or similar after open).
  const overlay = page.locator('#adventure-detail-overlay');
  await expect(overlay).toBeVisible({ timeout: 5000 });

  // Detail content was populated.
  const content = page.locator('#adventure-detail-content');
  await expect(content).not.toBeEmpty();
});

test('adventures detail overlay closes via close button', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/adventures.html');
  await page.waitForFunction(
    () => (window as any).AdventuresState?.adventures?.length >= 1,
    null,
    { timeout: 10_000 }
  );

  const firstCard = page.locator('[data-adventure-id]').first();
  await firstCard.click();
  const overlay = page.locator('#adventure-detail-overlay');
  await expect(overlay).toBeVisible({ timeout: 5000 });

  // Close via the data-action close button (Escape only closes the
  // lightbox in this codebase, not the detail overlay).
  await page.locator('[data-action="closeAdventureDetail"]').first().click();
  await page.waitForTimeout(400);
  const isHidden = await page.evaluate(() => {
    const el = document.getElementById('adventure-detail-overlay');
    if (!el) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden' || el.getAttribute('aria-hidden') === 'true' || !el.classList.contains('is-active');
  });
  expect(isHidden).toBeTruthy();
});
