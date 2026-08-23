const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  isFilmDiaryEntry,
  parseXml,
  rssEntryToMovie
} = require('../../scripts/sync-letterboxd.js');

const RSS = `
  <rss><channel>
    <item>
      <title>28 Days Later, 2002 - ★★★½</title>
      <link>https://letterboxd.com/contentwatch/film/28-days-later/</link>
      <pubDate>Sun, 23 Aug 2026 16:25:21 +1200</pubDate>
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
    date: 'August 23, 2026',
    link: 'https://letterboxd.com/contentwatch/film/28-days-later/',
    rating: '★★★½',
    starCount: 3.5,
    year: '2002',
    poster: 'https://images.example/28-days-later.jpg',
    genre: 'Uncategorized',
    timesWatched: 1
  }]);
});
