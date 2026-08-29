import assert from 'node:assert/strict';
import test from 'node:test';

import { RATING_TIERS, ratingTier } from '../src/domain/rating-tier.ts';

test('app tiers match the website five-star bands', () => {
  assert.deepEqual(RATING_TIERS.map((tier) => tier.label), ['S Tier', 'A Tier', 'B Tier', 'C Tier', 'D Tier']);
  assert.equal(ratingTier(5)?.key, 's');
  assert.equal(ratingTier(4.5)?.key, 'a');
  assert.equal(ratingTier(3)?.key, 'b');
  assert.equal(ratingTier(2.5)?.key, 'c');
  assert.equal(ratingTier(1)?.key, 'd');
  assert.equal(ratingTier(0), null);
});
