import assert from 'node:assert/strict';
import test from 'node:test';

import { isInternalSiteUrl, isSafeExternalUrl } from '../src/services/site-navigation.ts';

test('the public website stays inside the Site tab', () => {
  assert.equal(isInternalSiteUrl('https://jevangoldsmith.com/'), true);
  assert.equal(isInternalSiteUrl('https://jevangoldsmith.com/essays'), true);
  assert.equal(isInternalSiteUrl('https://www.jevangoldsmith.com/books?rating=5#top'), true);
});

test('lookalike and external domains cannot load inside the Site tab', () => {
  assert.equal(isInternalSiteUrl('https://example.com/'), false);
  assert.equal(isInternalSiteUrl('https://jevangoldsmith.com.example.com/'), false);
  assert.equal(isInternalSiteUrl('http://jevangoldsmith.com/'), false);
  assert.equal(isInternalSiteUrl('javascript:alert(1)'), false);
  assert.equal(isInternalSiteUrl('not a URL'), false);
});

test('WebView bootstrap documents are allowed without widening network access', () => {
  assert.equal(isInternalSiteUrl('about:blank'), true);
});

test('only safe external link protocols can leave the Site tab', () => {
  assert.equal(isSafeExternalUrl('https://example.com/'), true);
  assert.equal(isSafeExternalUrl('http://example.com/'), true);
  assert.equal(isSafeExternalUrl('mailto:hello@example.com'), true);
  assert.equal(isSafeExternalUrl('tel:+61700000000'), true);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('file:///data/local/private.txt'), false);
  assert.equal(isSafeExternalUrl('not a URL'), false);
});

test('fresh page links retain anchors and filters while replacing stale revisions', async () => {
  const { freshSiteUrl, publicationPageUrl } = await import('../src/services/site-navigation.ts');
  const url = new URL(freshSiteUrl('https://jevangoldsmith.com/now.html?filter=a&jg_refresh=old#top', 'new'));
  assert.equal(url.searchParams.get('filter'), 'a');
  assert.equal(url.searchParams.get('jg_refresh'), 'new');
  assert.equal(url.hash, '#top');
  assert.equal(publicationPageUrl('now', 'starting-a-business'), 'https://jevangoldsmith.com/now.html');
  assert.throws(() => freshSiteUrl('https://evil.example/', 'new'), /Invalid/);
  assert.throws(() => freshSiteUrl('file:///private', 'new'), /Invalid/);
});
