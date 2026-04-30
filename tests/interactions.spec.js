const { test, expect } = require('@playwright/test');

test('books sidebar links scroll to card and activate link state', async ({ page }) => {
  await page.goto('/books.html');
  await page.locator('[data-action="toggle-sidebar"]').click();
  await page.locator('.sidebar-category[data-category="learning"]').click();
  const firstBookLink = page.locator('#category-learning .book-link').first();
  await expect(firstBookLink).toBeVisible();
  await firstBookLink.click();
  await expect(firstBookLink).toHaveClass(/active/);
});

test('books search and clear keep filtered rendering working', async ({ page }) => {
  await page.goto('/books.html');
  await page.locator('[data-action="toggle-sidebar"]').click();
  await page.locator('#book-search').fill('Atomic Habits');
  await expect(page.locator('.book-card:visible')).toHaveCount(1);
  await expect(page.locator('#search-clear-btn')).toBeVisible();
  await page.locator('#search-clear-btn').click();
  // Library size grows over time; just verify cards are rendered after clearing.
  await expect(page.locator('.book-card:visible').first()).toBeVisible();
  expect(await page.locator('.book-card:visible').count()).toBeGreaterThan(1);
});

test('movies filters and delegated sidebar actions still work', async ({ page }) => {
  await page.goto('/movies.html');
  await page.locator('[data-action="toggleSidebar"]').click();
  await page.locator('#movie-search').fill('Before');
  await expect(page.locator('.movie-card:visible')).toHaveCount(2);
  await page.locator('[data-action="clearMovieSearch"]').click();
  await page.locator('[data-action="toggleMovieGenre"][data-action-args="Romance"]').click();
  await expect(page.locator('#genre-romance')).toHaveClass(/expanded/);
  await page.locator('#genre-romance .movie-link').first().click();
  await expect(page.locator('#genre-romance .movie-link').first()).toHaveClass(/active/);
});

test('dateme landing and rejection restart work', async ({ page }) => {
  await page.goto('/dateme.html');
  await expect(page.locator('.funnel-title')).toContainText("Think You're My Type?");
  await page.locator('[data-action="startStage1"]').click();
  await expect(page.locator('.funnel-question')).toContainText('settle this once and for all');
  await page.locator('[data-action="selectAnswer"][data-action-args*="pineapple"]').first().click();
  await page.locator('[data-action="selectAnswer"][data-action-args*="under21"]').click();
  await expect(page.locator('.funnel-rejection')).toBeVisible();
  await page.locator('[data-action="renderLanding"]').click();
  await expect(page.locator('.funnel-title')).toContainText("Think You're My Type?");
});

test('search sanitizes unsafe result URLs', async ({ page }) => {
  await page.route('**/api/v1/search-index.json*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        records: [
          {
            title: 'Unsafe Link Test',
            summary: 'Should never render javascript href',
            section: 'test',
            type: 'page',
            tags: [],
            url: 'javascript:alert(1)'
          }
        ]
      })
    });
  });

  await page.goto('/search.html');
  const result = page.locator('.search-result-card').first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', '#');
});

test('adventures card opens detail overlay', async ({ page }) => {
  await page.goto('/adventures.html');
  const firstCard = page.locator('.adventure-compact-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await expect(page.locator('#adventure-detail-overlay')).toHaveClass(/active/);
});

test('essays navigation and delegated sidebar actions still work', async ({ page }) => {
  await page.goto('/essays.html');
  await expect(page.locator('#essays-container .article-full')).toBeVisible();

  await page.locator('[data-action="toggleCategory"][data-action-args="philosophy"]').click();
  await expect(page.locator('#category-philosophy')).toHaveClass(/expanded/);

  const nextButton = page.locator('[data-action="nextEssay"]').first();
  await expect(nextButton).toBeVisible();
  await nextButton.click();
  await expect(page.locator('#essays-container .article-full')).toBeVisible();
});

test('essays search and clear keep navigation state working', async ({ page }) => {
  await page.goto('/essays.html');
  await page.locator('#essay-search').fill('Hot Spas');
  await expect(page.locator('#essays-container h2')).toContainText('Hot Spas');
  await page.locator('#search-clear-btn').click();
  await expect(page.locator('#essays-container h2')).toContainText('Feed My Addiction');
});

test('people filters use delegated handlers', async ({ page }) => {
  await page.goto('/people.html');
  await page.locator('[data-action="togglePeopleSidebar"]').click();
  await page.locator('[data-action="filterByCategory"][data-action-args="science"]').click();
  await expect(page.locator('.person-card[data-category="science"]').first()).toBeVisible();
  await page.locator('#people-search').fill('Huberman');
  await expect(page.locator('.person-card:visible')).toHaveCount(1);
});

test('projects shared collection runtime filters and clears cards', async ({ page }) => {
  await page.goto('/projects.html');
  await page.locator('[data-action="toggleProjectSidebar"]').click();
  await page.locator('[data-action="filterProjects"][data-action-args="ai"]').click();
  await expect(page.locator('.project-card:visible')).toHaveCount(2);
  await page.locator('#project-search').fill('writing');
  await expect(page.locator('#project-search-clear-btn')).toBeVisible();
  await page.locator('#project-search-clear-btn').click();
  await expect(page.locator('.project-card:visible')).toHaveCount(5);
});

test('challenges shared collection runtime filters and clears cards', async ({ page }) => {
  await page.goto('/challenges.html');
  await page.locator('[data-action="toggleChallengeSidebar"]').click();
  await page.locator('[data-action="filterChallenges"][data-action-args="fitness"]').click();
  await expect(page.locator('.challenge-card:visible')).toHaveCount(1);
  await page.locator('#challenge-search').fill('learning');
  await expect(page.locator('#challenge-search-clear-btn')).toBeVisible();
  await page.locator('#challenge-search-clear-btn').click();
  await expect(page.locator('.challenge-card:visible')).toHaveCount(4);
});

test('podcasts shared collection runtime preserves curated card filtering', async ({ page }) => {
  await page.goto('/podcasts.html');
  await page.locator('[data-action="togglePodcastSidebar"]').click();
  await page.locator('[data-action="filterPodcasts"][data-action-args="business"]').click();
  await expect(page.locator('#podcasts-container .podcast-card:visible')).toHaveCount(3);
  await page.locator('#podcast-search').fill('huberman');
  await expect(page.locator('#podcast-search-clear-btn')).toBeVisible();
  await page.locator('#podcast-search-clear-btn').click();
  await expect(page.locator('#podcasts-container .podcast-card:visible')).toHaveCount(10);
});

test('books page keeps working on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/books.html');
  await page.locator('[data-action="toggle-sidebar"]').click();
  await expect(page.locator('#books-sidebar')).not.toHaveClass(/collapsed/);
  await page.locator('.sidebar-category[data-category="learning"]').click();
  await expect(page.locator('#category-learning')).toHaveClass(/expanded/);
});
