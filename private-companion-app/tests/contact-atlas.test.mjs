import test from 'node:test';
import assert from 'node:assert/strict';
import { approximateContactCoordinates, mappableContact } from '../src/services/contact-locations.ts';
import { atlasJson, contactMapHtml } from '../src/services/contact-map-html.ts';

test('latest saved city takes precedence over old coordinates', () => {
  const result = mappableContact({ location: 'London, UK', latitude: -27.47, longitude: 153.03 });
  assert.equal(result.latitude, 51.51);
  assert.equal(result.longitude, -0.13);
});

test('city matching rejects embedded names and supports city/country labels', () => {
  assert.equal(approximateContactCoordinates('Londonderry'), null);
  assert.deepEqual(approximateContactCoordinates('Sydney, Australia'), { latitude: -33.87, longitude: 151.21 });
  assert.equal(mappableContact({ location: '', latitude: NaN, longitude: 10 }), null);
  assert.equal(mappableContact({ location: '', latitude: 91, longitude: 10 }), null);
  assert.equal(mappableContact({ location: '', latitude: null, longitude: null }), null);
});

test('contact payload cannot escape the map script', () => {
  const payload = [{ id: '1', name: '</script><script>alert(1)</script>\u2028', location: 'London' }];
  const encoded = atlasJson(payload);
  assert.ok(!encoded.includes('<'));
  assert.deepEqual(JSON.parse(encoded), payload);
});

test('map inline scripts parse and preserve the initials expression', () => {
  const html = contactMapHtml({ css: '', js: '' });
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(script);
  assert.ok(html.includes('split(/\\s+/)'));
});
