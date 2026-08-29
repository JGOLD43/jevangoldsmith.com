import assert from 'node:assert/strict';
import test from 'node:test';

import { highResolutionPoster, movieSlug, normalizePublicMovie } from '../src/services/public-movies.ts';

test('website movies normalize into the Library movie shape', () => {
  const movie = normalizePublicMovie({
    title: 'The Example!', year: '2026', poster: 'https://example.com/poster.jpg',
    tmdbGenres: ['Drama', 'Thriller'], rating: '★★★★', starCount: 4, runtime: 120, timesWatched: 2,
  });
  assert.equal(movie.id, 'the-example');
  assert.deepEqual(movie.genres, ['Drama', 'Thriller']);
  assert.equal(movie.runtimeMinutes, 120);
  assert.equal(movie.timesWatched, 2);
  assert.match(movie.websiteUrl, /\/movies\/the-example\.html$/);
});

test('movie slugs match the public website detail routes', () => {
  assert.equal(movieSlug("Breakfast at Tiffany's"), 'breakfast-at-tiffanys');
  assert.equal(movieSlug('Spider-Man: Brand New Day'), 'spider-man-brand-new-day');
});

test('Letterboxd posters request a high-density app cover', () => {
  const url = 'https://a.ltrbxd.com/resized/film/poster-0-600-0-900-crop.jpg?v=1';
  assert.equal(highResolutionPoster(url), 'https://a.ltrbxd.com/resized/film/poster-0-1000-0-1500-crop.jpg?v=1');
  assert.equal(highResolutionPoster('https://example.com/poster.jpg'), 'https://example.com/poster.jpg');
});
