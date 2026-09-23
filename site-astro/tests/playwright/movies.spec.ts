import { test, expect } from '@playwright/test';

test('movies open in 3D by default and retain SSR cards and the gallery exit', async ({ page }) => {
  await page.goto('/movies.html');
  await expect(page.locator('#movie-library')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBe('disc-boxes');
  await page.locator('[data-close-movie-library]').click();
  await expect(page.locator('#movie-library')).toBeHidden();
  await page.reload();
  await expect(page.locator('#movie-library')).toBeHidden();
  // SSR'd cards available before any JS runs.
  expect(await page.locator('.movie-card').count()).toBeGreaterThanOrEqual(6);
});

test('movies load the first desktop row of cover images eagerly', async ({ page }) => {
  await page.goto('/movies.html?view=gallery');
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
  await page.goto('/movies.html?view=gallery');
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
  await page.goto('/movies.html?view=gallery');
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
  await page.goto('/movies.html?view=gallery');
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
  await page.goto('/movies.html?view=gallery');
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
  await page.goto('/movies.html?view=gallery');
  await page.locator('#movies-view-toggle').click();
  await page.getByRole('button', { name: 'Disc boxes' }).click();
  await expect(page.locator('#movie-library')).toBeVisible();
}

test('disc boxes are an additional view and return to the selected collections view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/movies.html?view=gallery');
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
  expect(new URL(page.url()).searchParams.get('view')).toBe('gallery');
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
  await page.getByRole('link', { name: 'Open case', exact: true }).click();
  await expect(page.locator('.detail-title')).toHaveText(selected);
  await expect(page.locator('.detail-back')).toHaveText('← Back to Disc boxes');
  await page.goBack();
  await expect(page.locator('#movie-library')).toBeVisible();
  await expect(page.locator('.movie-library-title')).toHaveText(selected);
  await expect(page).toHaveURL(shelfUrl);
  await page.getByRole('link', { name: 'Open case', exact: true }).click();
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
    expect(geometry.facingCamera).toBeLessThan(-.05);
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

test('collector display keeps its ledge level and centres the largest case above the controls', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 852 }, { width: 852, height: 393 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/movies.html?view=disc-boxes&discMovie=the-sadness');
    await expect(page.locator('.disc-case[aria-pressed="true"]')).toBeVisible();
    const display = await page.evaluate(() => {
      const selected = document.querySelector<HTMLElement>('.disc-case[aria-pressed="true"]')!;
      const index = Number(selected.dataset.discIndex);
      const bounds = selected.getBoundingClientRect();
      const neighbors = [-1, 1].map((offset) => document.querySelector<HTMLElement>(`[data-disc-index="${index + offset}"]`)!.getBoundingClientRect());
      const front = document.querySelector<HTMLElement>('.movie-library-shelf-front')!.getBoundingClientRect();
      const controls = document.querySelector<HTMLElement>('.movie-library-controls')!.getBoundingClientRect();
      const shelf = document.querySelector<HTMLElement>('.movie-library-shelf')!;
      return {
        centre: bounds.x + bounds.width / 2,
        selectedTop: bounds.top, selectedHeight: bounds.height, selectedBottom: bounds.bottom,
        neighborHeights: neighbors.map((box) => box.height),
        neighborBottoms: neighbors.map((box) => box.bottom),
        ledgeTop: front.top, ledgeBottom: front.bottom,
        controlTop: controls.top, controlBottom: controls.bottom,
        headerBottom: document.querySelector('.movie-library-header')!.getBoundingClientRect().bottom,
        shelfTransform: getComputedStyle(shelf).transform
      };
    });
    expect(Math.abs(display.centre - viewport.width / 2)).toBeLessThan(8);
    expect(display.shelfTransform).toBe('none');
    expect(display.selectedTop).toBeGreaterThan(display.headerBottom - 4);
    expect(Math.max(...display.neighborHeights)).toBeLessThan(display.selectedHeight);
    expect(Math.max(...display.neighborBottoms) - Math.min(...display.neighborBottoms)).toBeLessThan(4);
    expect(display.selectedBottom).toBeLessThan(display.ledgeTop);
    expect(display.ledgeBottom).toBeLessThan(display.controlTop);
    expect(display.controlBottom).toBeLessThanOrEqual(viewport.height);
  }
});

test('browsing cases clear each other before their visible stacking order changes', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 393, height: 852 }]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: viewport.width < 600 ? 'reduce' : 'no-preference' });
    await page.goto('/movies.html?view=disc-boxes&discMovie=the-negotiator');
    for (const direction of [1, -1]) {
      const selected = page.locator('.disc-case[aria-pressed="true"]');
      await expect.poll(() => selected.evaluate((node) => Math.abs(parseFloat((node as HTMLElement).style.getPropertyValue('--x'))))).toBeLessThan(1);
      const from = Number(await selected.getAttribute('data-disc-index'));
      await page.evaluate(({ from, to }) => {
        const state = window as typeof window & { discMotionFrames: Promise<{ overlap: number; front: string | null }[]> };
        state.discMotionFrames = new Promise((resolve) => {
          const frames: { overlap: number; front: string | null }[] = [];
          const started = performance.now();
          const sample = () => {
            const a = document.querySelector(`[data-disc-index="${from}"]`)!.getBoundingClientRect();
            const b = document.querySelector(`[data-disc-index="${to}"]`)!.getBoundingClientRect();
            const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right);
            const top = Math.max(a.top, b.top), bottom = Math.min(a.bottom, b.bottom);
            const hit = right > left ? document.elementFromPoint((left + right) / 2, (top + bottom) / 2)?.closest<HTMLElement>('.disc-case') : null;
            frames.push({ overlap: right - left, front: hit?.dataset.discIndex ?? null });
            if (performance.now() - started < 1400) requestAnimationFrame(sample);
            else resolve(frames);
          };
          requestAnimationFrame(sample);
        });
      }, { from, to: from + direction });
      await page.keyboard.press(direction > 0 ? 'ArrowRight' : 'ArrowLeft');
      const frames = await page.evaluate(() => (window as typeof window & { discMotionFrames: Promise<{ overlap: number; front: string | null }[]> }).discMotionFrames);
      expect(Math.min(...frames.map((frame) => frame.overlap))).toBeLessThan(0);
      const switchesThroughOverlap = frames.some((frame, index) => index > 0
        && frame.front !== null && frames[index - 1].front !== null
        && frame.front !== frames[index - 1].front
        && Math.min(frame.overlap, frames[index - 1].overlap) > 2);
      expect(switchesThroughOverlap).toBe(false);
    }
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

test('moving the disc shelf preserves the raster size of the movie artwork', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/movies.html?view=disc-boxes&discMovie=before-sunrise');
  await expect(page.locator('.disc-case[aria-pressed="true"]')).toBeVisible();
  await page.evaluate(async () => {
    const state = window as typeof window & { movieArtworkResizes: number };
    state.movieArtworkResizes = 0;
    const observer = new ResizeObserver((entries) => {
      // Recycling a case far outside the viewport removes its image entirely.
      // Only artwork still on the shelf must keep the same drawing surface.
      state.movieArtworkResizes += entries.filter((entry) => entry.target.isConnected).length;
    });
    document.querySelectorAll('.disc-case-cover img').forEach((image) => observer.observe(image));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    state.movieArtworkResizes = 0;
  });
  for (const [key, movie] of [['ArrowRight', 'before-sunset'], ['ArrowLeft', 'before-sunrise']]) {
    await page.keyboard.press(key);
    const selected = page.locator('.disc-case[aria-pressed="true"]');
    await expect(selected).toHaveAttribute('data-movie-id', movie);
    await expect.poll(() => selected.evaluate((node) => Math.abs(parseFloat((node as HTMLElement).style.getPropertyValue('--x'))))).toBeLessThan(.01);
  }
  expect(await page.evaluate(() => (window as typeof window & { movieArtworkResizes: number }).movieArtworkResizes)).toBe(0);
});

test('rotating a disc case keeps its artwork and shine on stable drawing layers', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/movies.html?view=disc-boxes&discMovie=before-sunrise');
  const selected = page.locator('.disc-case[aria-pressed="true"]');
  const cover = selected.locator('.disc-case-cover');
  const before = await cover.evaluate((node) => getComputedStyle(node, '::after').backgroundImage);
  const box = await selected.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 25, { steps: 12 });
  await expect.poll(() => selected.evaluate((node) => parseFloat((node as HTMLElement).style.getPropertyValue('--inspect-yaw')))).toBeGreaterThan(20);
  expect(await cover.evaluate((node) => getComputedStyle(node, '::after').backgroundImage)).toBe(before);
  await page.mouse.up();
  await page.mouse.move(0, 0);
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

test('selected movie opens its lid and reveals its disc before entering the case page', async ({ page }) => {
  const errors: string[] = [];
  let returning = false;
  page.on('pageerror', (error) => {
    // Chromium sometimes rejects its native history transition with no exposed
    // ViewTransition object. This is a cancelled browser animation, not a script failure.
    if (returning && error.name === 'AbortError' && error.message === 'Transition was skipped') return;
    errors.push(error.message);
  });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 852 }]) {
    returning = false;
    await page.setViewportSize(viewport);
    await page.goto('/movies.html?view=disc-boxes&discMovie=seconds');
    await page.locator('.disc-case[aria-pressed="true"]').click();
    const opening = page.locator('.movie-case-opening-overlay');
    await expect(opening).toBeVisible();
    const lid = opening.locator('.movie-case-lid');
    await expect.poll(() => lid.evaluate((node) => getComputedStyle(node).transform), { intervals: [20] })
      .not.toBe('matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
    // Observe the short zoom phase on animation frames, not assertion backoff.
    await page.waitForFunction(() => document.querySelector<HTMLElement>('.movie-case-opening-overlay')?.dataset.phase === 'zoom', null, { polling: 'raf' });
    await expect(opening.locator('.movie-case-disc')).toBeVisible();
    await expect(page).toHaveURL(/\/movies\/seconds\.html\?from=disc-boxes/);
    await expect(page.locator('.movie-case-insert .detail-title')).toHaveText('Seconds');
    await expect(page.getByRole('img', { name: 'Seconds disc', exact: true })).toBeVisible();
    await expect(page.locator('.movie-case-insert .detail-prose').first()).toContainText('middle-aged banker');
    const layout = await page.evaluate(() => {
      const insert = document.querySelector('.movie-case-insert')!.getBoundingClientRect();
      const tray = document.querySelector('.movie-case-tray')!.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - innerWidth, insertX: insert.x, insertY: insert.y, trayX: tray.x, trayBottom: tray.bottom };
    });
    expect(layout.overflow).toBeLessThanOrEqual(1);
    if (viewport.width < 640) expect(layout.insertY).toBeGreaterThan(layout.trayBottom);
    else expect(layout.trayX).toBeGreaterThan(layout.insertX);
    // Allow the document transition to settle before back navigation.
    await page.waitForTimeout(600);
    returning = true;
    await page.goBack();
    await expect(page.locator('#movie-library')).toBeVisible();
    await expect(page.locator('#movie-library')).not.toHaveAttribute('inert', '');
    await expect(page.locator('.movie-case-opening-overlay')).toHaveCount(0);
    await expect(page.locator('.disc-case[aria-pressed="true"]')).toBeVisible();
    // Resizing during the native back transition intentionally aborts it.
    await page.waitForTimeout(600);
  }
  expect(errors).toEqual([]);
});

test('Escape cancels opening a movie and restores browsing without navigating', async ({ page }) => {
  await page.goto('/movies.html?view=disc-boxes&discMovie=seconds');
  await page.getByRole('link', { name: 'Open case', exact: true }).click();
  await expect(page.locator('.movie-case-opening-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.movie-case-opening-overlay')).toHaveCount(0);
  await expect(page.locator('#movie-library')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.movie-library-stage')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.movie-library-title')).not.toHaveText('Seconds');
  // Let the original opening finish time pass: cancelled work must never navigate.
  await page.waitForTimeout(1800);
  expect(new URL(page.url()).pathname).toBe('/movies.html');
});

test('explicit case opening remains visible with reduced motion and direct links work without JavaScript', async ({ browser, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 852 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/movies.html?view=disc-boxes&discMovie=the-dark-knight&discSort=tiers');
    const caseBefore = await page.locator('.disc-case[aria-pressed="true"]').boundingBox();
    if (viewport.width > 640) await page.getByRole('link', { name: 'Open case', exact: true }).click();
    else await page.locator('.disc-case[aria-pressed="true"]').click();
    const opening = page.locator('.movie-case-opening-overlay');
    await expect(opening).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/movies.html');
    await expect(opening).toHaveAttribute('data-phase', 'lifting');
    const shell = opening.locator('.movie-open-case');
    const shellBox = await shell.boundingBox();
    const lidBox = await opening.locator('.movie-case-lid').boundingBox();
    expect(lidBox!.height).toBeLessThanOrEqual(shellBox!.height + 2);
    await expect.poll(async () => (await shell.boundingBox())!.y, { intervals: [16] }).toBeLessThan(caseBefore!.y - 4);
    await page.waitForFunction(() => document.querySelector<HTMLElement>('.movie-case-opening-overlay')?.dataset.phase === 'opening', null, { polling: 'raf' });
    await expect.poll(() => opening.locator('.movie-case-lid').evaluate((node) => getComputedStyle(node).transform), { intervals: [20] })
      .not.toBe('matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
    await expect(opening.locator('[data-case-rating]')).toHaveText('★★★★½');
    await page.waitForFunction(() => document.querySelector<HTMLElement>('.movie-case-opening-overlay')?.dataset.phase === 'zoom', null, { polling: 'raf' });
    await expect(opening.locator('.movie-case-disc')).toBeVisible();
    await expect(page).toHaveURL(/\/movies\/the-dark-knight\.html\?from=disc-boxes/);
    await expect(page.locator('.movie-case-insert .detail-title')).toHaveText('The Dark Knight');
    await expect(page.locator('.movie-case-opening-overlay')).toHaveCount(0);
  }
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 393, height: 852 } });
  const direct = await noScript.newPage();
  await direct.goto(new URL('/movies/seconds.html', page.url()).href);
  await expect(direct.getByRole('heading', { name: 'Synopsis', exact: true })).toBeVisible();
  await expect(direct.locator('.movie-case-insert .detail-prose').first()).toContainText('middle-aged banker');
  await expect(direct.getByRole('img', { name: 'Seconds disc', exact: true })).toBeVisible();
  await noScript.close();
});
