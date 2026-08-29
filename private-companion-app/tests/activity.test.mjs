import assert from 'node:assert/strict';
import test from 'node:test';

import { activityDateKey, activityStreaks, activityWeekStreaks, mergeDailyActivity } from '../src/domain/activity.ts';

test('website movie dates normalize consistently on Android', () => {
  assert.equal(activityDateKey('August 23, 2026'), '2026-08-23');
  assert.equal(activityDateKey('2026-08-23'), '2026-08-23');
  assert.equal(activityDateKey('February 30, 2026'), null);
});

test('daily activity reports current and longest streaks', () => {
  const result = activityStreaks(
    ['2026-08-18', '2026-08-19', '2026-08-23', '2026-08-24'],
    '2026-08-25',
  );

  assert.deepEqual(result, { current: 2, longest: 2, activeDays: 4 });
});

test('daily activity resets the current streak when the latest day is stale', () => {
  const result = activityStreaks(['2026-08-20', '2026-08-21'], '2026-08-25');
  assert.equal(result.current, 0);
  assert.equal(result.longest, 2);
});

test('weekly streaks combine activity days into consecutive calendar weeks', () => {
  const result = activityWeekStreaks(
    ['2026-08-03', '2026-08-12', '2026-08-20', '2026-08-24'],
    '2026-08-25',
  );

  assert.deepEqual(result, { current: 4, longest: 4, activeWeeks: 4 });
});

test('daily activity merges multiple sessions on the same day', () => {
  assert.deepEqual(mergeDailyActivity([
    { date: '2026-08-25', value: 600, count: 1 },
    { date: '2026-08-24', value: 300, count: 1 },
    { date: '2026-08-25', value: 900, count: 2 },
  ]), [
    { date: '2026-08-24', value: 300, count: 1 },
    { date: '2026-08-25', value: 1500, count: 3 },
  ]);
});
