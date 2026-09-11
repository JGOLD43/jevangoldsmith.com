const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../site-astro/src/lib/book-reading-years.ts');

test('reading-year filters never substitute publication years or hide unknown years from All years', async () => {
  const { bookReadingYears, matchesReadingYear } = await load();
  const unknown = { title: 'An older book', year: 1984, read: true };
  assert.deepEqual(bookReadingYears(unknown), []);
  assert.equal(matchesReadingYear(unknown, 'all'), true);
  assert.equal(matchesReadingYear(unknown, '1984'), false);
  assert.equal(matchesReadingYear(unknown, '2026'), false);
});

test('rereads appear in each recorded year, with unique newest-first year choices', async () => {
  const { availableReadingYears, matchesReadingYear } = await load();
  const reread = { read: true, readYears: [2023, 2025, 2025] };
  const books = [reread, { readYears: [2024] }, { read: false, readYears: [2026] }];
  assert.deepEqual(availableReadingYears(books), [2025, 2024, 2023]);
  assert.equal(matchesReadingYear(reread, '2023'), true);
  assert.equal(matchesReadingYear(reread, '2025'), true);
  assert.equal(matchesReadingYear(reread, '2024'), false);
  assert.equal(matchesReadingYear(books[2], '2026'), false);
});

test('missing and malformed reading-year metadata cannot create spurious year choices', async () => {
  const { availableReadingYears, bookReadingYears } = await load();
  assert.deepEqual(bookReadingYears({ readYears: null }), []);
  assert.deepEqual(bookReadingYears({ readYears: '2025' }), []);
  assert.deepEqual(availableReadingYears([
    {}, { readYears: [null, '', '2024', 0, 2024.5, 10000, 2025] }
  ]), [2025]);
});
