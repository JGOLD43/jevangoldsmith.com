const test = require('node:test');
const assert = require('node:assert/strict');

test('archived articles keep their original publication identity', async () => {
  const { articleSourceHost, articleArtwork } = await import('../../site-astro/src/lib/article-artwork.ts');
  for (const url of [
    'https://www.nytimes.com/2020/01/01/example.html',
    'https://web.archive.org/web/20200101000000/https://www.nytimes.com/2020/01/01/example.html',
    'https://www.removepaywall.com/https://www.nytimes.com/2020/01/01/example.html',
    'https://archive.nytimes.com/example.html',
  ]) {
    assert.equal(articleSourceHost(url), 'nytimes.com');
    assert.equal(articleArtwork({ url }).source, 'The New York Times');
  }
});

test('unlisted publications keep an accurate name and consistent design across articles', async () => {
  const { articleArtwork } = await import('../../site-astro/src/lib/article-artwork.ts');
  const first = articleArtwork({ url: 'https://www.example.org/one' });
  assert.equal(first.source, 'example.org');
  assert.deepEqual(first, articleArtwork({ url: 'https://example.org/two' }));
});
