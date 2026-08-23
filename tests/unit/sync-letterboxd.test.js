const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  isFilmDiaryEntry,
  latestDiaryEntries,
  mergeMovies,
  parseXml,
  rssEntryToMovie
} = require('../../scripts/sync-letterboxd.js');

const RSS = `
  <rss><channel>
    <item>
      <title>28 Days Later, 2002 - ★★★½</title>
      <link>https://letterboxd.com/contentwatch/film/28-days-later/</link>
      <pubDate>Sun, 23 Aug 2026 16:25:21 +1200</pubDate>
      <letterboxd:watchedDate>2026-08-22</letterboxd:watchedDate>
      <letterboxd:filmTitle>28 Days Later</letterboxd:filmTitle>
      <letterboxd:filmYear>2002</letterboxd:filmYear>
      <description><![CDATA[<img src="https://images.example/28-days-later.jpg">]]></description>
    </item>
    <item>
      <title>To watch</title>
      <link>https://letterboxd.com/contentwatch/list/to-watch/</link>
      <pubDate>Fri, 21 Aug 2026 20:47:07 +1200</pubDate>
    </item>
  </channel></rss>`;

test('Letterboxd sync imports diary films and excludes lists', () => {
  const entries = parseXml(RSS);
  const films = entries.filter(isFilmDiaryEntry).map(rssEntryToMovie);

  assert.equal(entries.length, 2);
  assert.deepEqual(films, [{
    title: '28 Days Later',
    date: 'August 22, 2026',
    link: 'https://letterboxd.com/contentwatch/film/28-days-later/',
    rating: '★★★½',
    starCount: 3.5,
    year: '2002',
    poster: 'https://images.example/28-days-later.jpg',
    genre: 'Uncategorized',
    timesWatched: 1
  }]);
});

test('Letterboxd sync keeps the latest rewatch and refreshes feed-owned fields', () => {
  const entries = [
    { filmTitle: 'Moon', pubDate: 'Fri, 21 Aug 2026 20:00:00 +0000' },
    { filmTitle: 'Moon', pubDate: 'Thu, 20 Aug 2026 20:00:00 +0000' }
  ];
  assert.deepEqual(latestDiaryEntries(entries), [entries[0]]);

  const existing = [{
    title: 'Moon', date: 'June 22, 2026', rating: '★★', starCount: 2,
    year: '2009', link: 'https://letterboxd.com/contentwatch/film/moon/',
    poster: 'old.jpg', genre: 'Drama', tmdbId: 17431, review: 'Personal note'
  }];
  const fetched = [{
    title: 'Moon', date: 'August 21, 2026', rating: '★★★★', starCount: 4,
    year: '2009', link: 'https://letterboxd.com/contentwatch/film/moon/1/',
    poster: 'new.jpg', genre: 'Uncategorized'
  }];

  const { merged, added, updated } = mergeMovies(existing, fetched);
  assert.equal(added, 0);
  assert.equal(updated, 1);
  assert.equal(merged[0].rating, '★★★★');
  assert.equal(merged[0].link, 'https://letterboxd.com/contentwatch/film/moon/1/');
  assert.equal(merged[0].tmdbId, 17431);
  assert.equal(merged[0].review, 'Personal note');
  assert.equal(merged[0].genre, 'Drama');
});
