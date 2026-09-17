const { test } = require('node:test');
const assert = require('node:assert/strict');

test('signup attribution keeps campaign labels and strips private query details', async () => {
  const { signupAttribution } = await import('../../site-astro/src/lib/newsletter-attribution.ts');
  const result = signupAttribution('https://jevangoldsmith.com/now.html?utm_source=linkedin&utm_campaign=monthly-launch&email=someone@example.com&lat=-26&lng=153#private', 'https://example.com/private-page?email=someone@example.com');
  assert.deepEqual(result, { landing_page: '/now.html', utm_source: 'linkedin', utm_campaign: 'monthly-launch', referrer_host: 'example.com' });
  assert.deepEqual(signupAttribution('https://jevangoldsmith.com/?utm_content=someone@example.com', 'broken'), { landing_page: '/' });
  assert.deepEqual(signupAttribution('https://jevangoldsmith.com/', 'https://jevangoldsmith.com/now.html'), { landing_page: '/' });
});

test('a successful HTTP response is not itself a successful signup', async () => {
  const { isAcceptedSignup } = await import('../../site-astro/src/lib/newsletter-attribution.ts');
  for (const body of [null, false, {}, { success: false }, { success: 'false' }, { error: 'not activated' }]) assert.equal(isAcceptedSignup(body), false);
  assert.equal(isAcceptedSignup({ success: true }), true);
  assert.equal(isAcceptedSignup({ success: 'true' }), true);
});
