import { test, expect } from '@playwright/test';

test('movies page renders SSR cards immediately', async ({ page }) => {
  await page.goto('/movies.html');
  // SSR'd cards available before any JS runs.
  expect(await page.locator('.movie-card').count()).toBeGreaterThanOrEqual(6);
});

test('movies load the first desktop row of cover images eagerly', async ({ page }) => {
  await page.goto('/movies.html');
  const loading = await page.locator('.movies-grid .movie-poster').evaluateAll((images) =>
    images.slice(0, 7).map((image) => ({
      loading: image.getAttribute('loading'),
      fetchPriority: image.getAttribute('fetchpriority')
    }))
  );

  expect(loading.slice(0, 6)).toEqual(
    Array.from({ length: 6 }, () => ({ loading: 'eager', fetchPriority: 'high' }))
  );
  expect(loading[6]).toEqual({ loading: 'lazy', fetchPriority: null });
});

test('movie collections mode uses the full desktop content width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/movies.html');
  await page.locator('#movies-view-toggle').click();
  await page.getByRole('button', { name: 'Collections', exact: true }).click();

  const gridLayout = await page.evaluate(() => {
    const layout = document.getElementById('movies-layout');
    const main = document.querySelector<HTMLElement>('.movies-main');
    const grid = document.getElementById('movies-genre-grid');
    const cards = Array.from(grid?.querySelectorAll<HTMLElement>('.category-card') ?? []);
    return {
      layoutClass: layout?.className ?? '',
      layoutColumns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
      mainWidth: main?.getBoundingClientRect().width ?? 0,
      gridWidth: grid?.getBoundingClientRect().width ?? 0,
      cardWidths: cards.map((card) => card.getBoundingClientRect().width)
    };
  });

  expect(gridLayout.layoutClass).toContain('grid-view-active');
  expect(gridLayout.layoutColumns.trim().split(/\s+/)).toHaveLength(1);
  expect(gridLayout.mainWidth).toBeGreaterThan(1200);
  expect(gridLayout.gridWidth).toBeGreaterThan(1100);
  expect(gridLayout.cardWidths).toHaveLength(3);
  expect(Math.min(...gridLayout.cardWidths)).toBeGreaterThan(300);
});

test('movies retain one valid grid item per SSR card after hydration', async ({ page }) => {
  await page.goto('/movies.html');
  const initialTitles = await page.locator('#movies-container > .movie-card').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-movie-title'))
  );
  expect(initialTitles.length).toBeGreaterThanOrEqual(6);
  await page.waitForLoadState('networkidle');
  const hydrated = await page.evaluate(() => {
    const grid = document.getElementById('movies-container');
    const cards = Array.from(grid?.querySelectorAll(':scope > .movie-card') ?? []);
    return {
      cardCount: cards.length,
      childCount: grid?.children.length ?? 0,
      nestedLinks: cards.some((card) => card.querySelector('a a') !== null)
    };
  });
  expect(hydrated.cardCount).toBe(initialTitles.length);
  expect(hydrated.childCount).toBe(initialTitles.length);
  expect(hydrated.nestedLinks).toBe(false);
});

test('movie tier badges stay inside their sidebar movie rows', async ({ page }) => {
  await page.goto('/movies.html');
  await page.waitForLoadState('networkidle');
  await page.locator('.sidebar-collapse-btn').click();

  const placement = await page.locator('.movie-link:has(.movie-search-tier-badge)').first().evaluate((link) => {
    const badge = link.querySelector<HTMLElement>('.movie-search-tier-badge');
    const linkRect = link.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    return {
      position: getComputedStyle(link).position,
      isOffsetParent: badge?.offsetParent === link,
      badgeTop: badgeRect?.top,
      badgeBottom: badgeRect?.bottom,
      linkTop: linkRect.top,
      linkBottom: linkRect.bottom
    };
  });

  expect(placement.position).toBe('relative');
  expect(placement.isOffsetParent).toBe(true);
  expect(placement.badgeTop).toBeGreaterThanOrEqual(placement.linkTop);
  expect(placement.badgeBottom).toBeLessThanOrEqual(placement.linkBottom);
});

test('filtered movie stats retain the compact redesigned layout', async ({ page }) => {
  await page.goto('/movies.html');
  await page.locator('#movie-search').evaluate((input: HTMLInputElement) => {
    input.value = 'dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('.stats-toggle').click();

  const panel = page.locator('#movie-stats-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Films by rating')).toHaveCount(0);
  await expect(panel.getByText('Best-rated genres')).toHaveCount(1);
  await expect(panel.locator('.stats-detail-grid')).toHaveCount(2);
  expect(await panel.locator('.stats-section').count()).toBeLessThanOrEqual(4);
});

async function openDiscBoxes(page: import('@playwright/test').Page) {
  await page.goto('/movies.html');
  await page.locator('#movies-view-toggle').click();
  await page.getByRole('button', { name: 'Disc boxes' }).click();
  await expect(page.locator('#movie-library')).toBeVisible();
}

test('disc boxes are an additional view and return to the selected collections view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/movies.html');
  await page.locator('#movies-view-toggle').click();
  await page.getByRole('button', { name: 'Collections', exact: true }).click();
  await expect(page.locator('#movies-genre-grid-view')).toBeVisible();
  await page.locator('#movies-view-toggle').click();
  await page.getByRole('button', { name: 'Disc boxes' }).click();
  await expect(page.locator('#movie-library')).toBeVisible();
  await expect(page.locator('.movies-main')).toHaveAttribute('inert', '');
  await expect(page.locator('.movie-library-track .disc-case')).toHaveCount(25);
  await expect(page.locator('.disc-case[aria-pressed="true"] .disc-case-edge')).toHaveCount(1);
  await expect(page.locator('.disc-case[aria-pressed="true"] .disc-case-spine')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(page.locator('#movie-library')).toBeHidden();
  await expect(page.locator('#movies-genre-grid-view')).toBeVisible();
  await expect(page.locator('.movies-main')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#movies-view-toggle')).toBeFocused();
  expect(new URL(page.url()).searchParams.has('view')).toBe(false);
  expect(errors).toEqual([]);
});

test('disc shelf keyboard browsing wraps, selects the last movie and restores on reload', async ({ page }) => {
  await openDiscBoxes(page);
  const first = await page.locator('.movie-library-title').innerText();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.movie-library-title')).not.toHaveText(first);
  const second = await page.locator('.movie-library-title').innerText();
  await page.reload();
  await expect(page.locator('.movie-library-title')).toHaveText(second);
  await page.keyboard.press('Home');
  await expect(page.locator('.movie-library-title')).toHaveText(first);
  await page.keyboard.press('ArrowLeft');
  const last = await page.locator('.movie-library-title').innerText();
  await page.keyboard.press('Home');
  await page.keyboard.press('End');
  await expect(page.locator('.movie-library-title')).toHaveText(last);
  await expect.poll(() => page.locator('.movie-library-track .disc-case').count()).toBeLessThanOrEqual(25);
});

test('disc sorting, movie details and return links preserve the selected shelf', async ({ page }) => {
  await openDiscBoxes(page);
  await page.locator('.movie-library-sort summary').click();
  await page.getByRole('button', { name: 'By tiers' }).click();
  await expect(page.locator('#movie-library')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.movie-library-group')).toHaveText(/^[SA] Tier$/);
  await page.getByRole('button', { name: 'Next movie', exact: true }).click();
  const tier = await page.locator('.movie-library-group').textContent() || '';
  const selected = await page.locator('.movie-library-title').innerText();
  const shelfUrl = page.url();
  await page.getByRole('link', { name: 'View movie', exact: true }).click();
  await expect(page.locator('.detail-title')).toHaveText(selected);
  await expect(page.locator('.detail-back')).toHaveText('← Back to Disc boxes');
  await page.goBack();
  await expect(page.locator('#movie-library')).toBeVisible();
  await expect(page.locator('.movie-library-title')).toHaveText(selected);
  await expect(page).toHaveURL(shelfUrl);
  await page.getByRole('link', { name: 'View movie', exact: true }).click();
  await page.locator('.detail-back').click();
  await expect(page.locator('.movie-library-title')).toHaveText(selected);
  await expect(page.locator('.movie-library-group')).toHaveText(tier);
  await page.locator('.movie-library-sort summary').click();
  await page.getByRole('button', { name: 'By genre' }).click();
  await expect(page.locator('#movie-library')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.movie-library-group')).not.toBeEmpty();
  expect(new URL(page.url()).searchParams.get('discSort')).toBe('collection');
});

test('disc shelf fits a phone and restores interactive gallery after resizing', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await openDiscBoxes(page);
  await expect(page.locator('.collection-mobile-toggle')).toBeHidden();
  const selected = page.locator('.disc-case[aria-pressed="true"]');
  const box = await selected.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(0);
  expect(box!.x + box!.width).toBeLessThan(393);
  const controls = await page.locator('.movie-library-controls').boundingBox();
  expect(controls!.y).toBeGreaterThan(box!.y + box!.height);
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(852);
  await page.setViewportSize({ width: 852, height: 393 });
  await expect(page.locator('.movies-main')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Movies', exact: true }).click();
  await expect(page.locator('.movies-main')).not.toHaveAttribute('inert', '');
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.locator('.collection-mobile-toggle')).toBeVisible();
  await page.locator('.mobile-view-btn[data-view="collection"]').click();
  await expect(page.locator('#movies-genre-grid-view')).toBeVisible();
  await page.locator('#movies-view-toggle').click();
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await expect(page.locator('.mobile-view-btn[data-view="list"]')).toHaveAttribute('aria-selected', 'true');
});

test('disc cases rotate by dragging and shelf dragging selects a new movie', async ({ page }) => {
  await openDiscBoxes(page);
  const selected = page.locator('.disc-case[aria-pressed="true"]');
  const box = await selected.boundingBox();
  const initial = await page.locator('.movie-library-title').innerText();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 70, box!.y + box!.height / 2, { steps: 8 });
  await expect(page.locator('.movie-library-stage')).toHaveAttribute('data-rotating', 'true');
  await expect.poll(() => selected.evaluate((node) => Math.abs(parseFloat((node as HTMLElement).style.getPropertyValue('--inspect-yaw'))))).toBeGreaterThan(10);
  await page.mouse.up();
  await expect(page.locator('.movie-library-title')).toHaveText(initial);
  const stage = await page.locator('.movie-library-stage').boundingBox();
  await page.mouse.move(stage!.x + stage!.width / 2, stage!.y + 30);
  await page.mouse.down();
  await page.mouse.move(stage!.x + stage!.width / 2 - 130, stage!.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.movie-library-title')).not.toHaveText(initial);
  await expect(page.locator('.movie-library-stage')).not.toHaveAttribute('data-dragging', 'true');
});

test('DVD spines are revealed by turning the case and the artwork has a narrow plastic rim', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 852 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/movies.html?view=disc-boxes&discMovie=28-days-later');
    const selected = page.locator('.disc-case[aria-pressed="true"]');
    await expect(selected.locator('.disc-case-spine-title')).toHaveText('28 Days Later');
    const geometry = await selected.evaluate((node) => {
      const spine = node.querySelector<HTMLElement>('.disc-case-spine')!;
      const cover = node.querySelector<HTMLElement>('.disc-case-cover')!;
      const spineArtwork = node.querySelector<HTMLImageElement>('.disc-case-spine-art')!;
      const frontArtwork = cover.querySelector<HTMLImageElement>('img')!;
      const caseMatrix = new DOMMatrix(getComputedStyle(node).transform);
      const spineMatrix = new DOMMatrix(getComputedStyle(spine).transform);
      const coverStyle = getComputedStyle(cover);
      return {
        // The spine belongs on the far side until the reader turns the case.
        facingCamera: caseMatrix.multiply(spineMatrix).m33,
        backface: getComputedStyle(spine).backfaceVisibility,
        rim: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map((key) => parseFloat(coverStyle[key as keyof CSSStyleDeclaration] as string)),
        artworkMatches: spineArtwork.src === frontArtwork.src
      };
    });
    expect(geometry.facingCamera).toBeLessThan(-.2);
    expect(geometry.backface).toBe('hidden');
    expect(Math.max(...geometry.rim)).toBeLessThanOrEqual(3);
    expect(geometry.artworkMatches).toBe(true);
    const box = await selected.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 100, box!.y + box!.height / 2, { steps: 8 });
    await expect.poll(() => selected.evaluate((node) => {
      const spine = node.querySelector<HTMLElement>('.disc-case-spine')!;
      return new DOMMatrix(getComputedStyle(node).transform).multiply(new DOMMatrix(getComputedStyle(spine).transform)).m33;
    })).toBeGreaterThan(.3);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(() => selected.evaluate((node) => parseFloat((node as HTMLElement).style.getPropertyValue('--inspect-yaw')))).toBe(0);
  }
});

test('disc shelf supports touch swiping and reduced motion sorting', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openDiscBoxes(page);
  const initial = await page.locator('.movie-library-title').innerText();
  const stage = await page.locator('.movie-library-stage').boundingBox();
  const client = await context.newCDPSession(page);
  const y = stage!.y + 30;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 270, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 90, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.movie-library-title')).not.toHaveText(initial);
  await expect(page.locator('.mobile-view-btn[data-view="list"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('.movie-library-sort summary').tap();
  await expect(page.locator('.movie-library-sort')).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'By tiers' }).tap();
  await expect(page.locator('.movie-library-stage-outgoing')).toHaveCount(0);
  await expect(page.locator('.movie-library-group')).toBeVisible();
  await context.close();
});

test('missing movie posters have a usable case and detail link', async ({ page }) => {
  await page.route(/a\.ltrbxd\.com|image\.tmdb\.org/, (route) => route.abort());
  await page.goto('/movies.html?view=disc-boxes');
  await expect(page.locator('.disc-case[aria-pressed="true"] .disc-case-fallback')).toBeVisible();
  const selected = await page.locator('.movie-library-title').innerText();
  await expect(page.locator('.disc-case[aria-pressed="true"] .disc-case-spine-title')).toHaveText(selected);
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-title')).toHaveText(selected);
});
