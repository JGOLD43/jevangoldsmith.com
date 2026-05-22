const { test } = require('node:test');
const assert = require('node:assert/strict');

async function loadStatsCore() {
  return import('../../site-astro/src/lib/movie-stats-core.ts');
}

test('movie stats computes watches, minutes, extremes, and averages', async () => {
  const { computeMovieStats, fmtHours, fmtRuntime, watchCount } = await loadStatsCore();
  const movies = [
    { title: 'Short', year: 1999, runtime: 80, genre: 'Drama', starCount: 4, timesWatched: 2 },
    { title: 'Long', year: 2001, runtime: 160, genre: 'Sci-Fi', starCount: 5, timesWatched: 1 },
    { title: 'No Runtime', year: 2001, genre: 'Drama', starCount: 3 }
  ];

  const stats = computeMovieStats(movies);

  assert.equal(stats.totalFilms, 3);
  assert.equal(stats.totalWatches, 4);
  assert.equal(stats.totalMinutes, 320);
  assert.equal(stats.totalHours, 5);
  assert.equal(stats.avgRuntime, 120);
  assert.equal(stats.longest.title, 'Long');
  assert.equal(stats.shortest.title, 'Short');
  assert.deepEqual(stats.filmsByDecade, { '1990s': 1, '2000s': 2 });
  assert.equal(stats.hoursByGenre.Drama, 160);
  assert.equal(stats.hoursByGenre['Sci-Fi'], 160);
  assert.equal(stats.filmsByRating[5], 1);
  assert.equal(stats.mostRewatched[0].title, 'Short');
  assert.equal(watchCount({ timesWatched: 0 }), 1);
  assert.equal(fmtRuntime(125), '2h 5m');
  assert.equal(fmtHours(90), '1.5 hr');
});

test('movie stats handles missing runtime data', async () => {
  const { computeMovieStats, fmtRuntime } = await loadStatsCore();
  const stats = computeMovieStats([{ title: 'Untimed', starCount: 4 }]);

  assert.equal(stats.enrichedCount, 0);
  assert.equal(stats.avgRuntime, 0);
  assert.equal(stats.longest, null);
  assert.equal(stats.shortest, null);
  assert.equal(fmtRuntime(0), '-');
});
