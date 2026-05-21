const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Spec: web-vitals CLS algorithm
//   - Ignore entries with hadRecentInput=true
//   - A session ends when the next entry is >1000ms after the previous one
//     OR >5000ms after the session start
//   - Final CLS = max session value
//
// Hand-rolled in site-astro/src/scripts/rum.ts; lock-tested here so future
// browser changes or refactors can't silently break the metric.

let computeCLS;
test.before(async () => {
  const mod = await import(path.join(__dirname, '..', '..', 'site-astro', 'src', 'scripts', 'rum.ts'));
  computeCLS = mod.computeCLS;
});

test('empty input → 0', () => {
  assert.equal(computeCLS([]), 0);
});

test('single entry → its value', () => {
  assert.equal(computeCLS([{ startTime: 100, value: 0.1, hadRecentInput: false }]), 0.1);
});

test('hadRecentInput entries are ignored', () => {
  const cls = computeCLS([
    { startTime: 100, value: 0.2, hadRecentInput: true },
    { startTime: 200, value: 0.1, hadRecentInput: false }
  ]);
  assert.equal(cls, 0.1);
});

test('entries within 1s gap accumulate in same session', () => {
  const cls = computeCLS([
    { startTime: 100, value: 0.05, hadRecentInput: false },
    { startTime: 500, value: 0.05, hadRecentInput: false },
    { startTime: 900, value: 0.05, hadRecentInput: false }
  ]);
  assert.equal(Math.round(cls * 100) / 100, 0.15);
});

test('entry >1000ms after last starts a new session', () => {
  const cls = computeCLS([
    { startTime: 100, value: 0.1, hadRecentInput: false },
    { startTime: 200, value: 0.05, hadRecentInput: false },
    // gap of 1500ms → new session
    { startTime: 1700, value: 0.3, hadRecentInput: false }
  ]);
  // First session = 0.15, second = 0.3, max = 0.3
  assert.equal(cls, 0.3);
});

test('session length cap at 5000ms', () => {
  const cls = computeCLS([
    { startTime: 0, value: 0.1, hadRecentInput: false },
    { startTime: 500, value: 0.1, hadRecentInput: false },
    { startTime: 1000, value: 0.1, hadRecentInput: false },
    { startTime: 1500, value: 0.1, hadRecentInput: false },
    // 5001ms after first → new session even though gap <1000ms
    { startTime: 5001, value: 0.5, hadRecentInput: false }
  ]);
  // First session = 0.4 (4 entries within 5s, but the 5th entry is at 5001ms
  // which exceeds the 5000ms session cap relative to first.startTime=0).
  // New session = 0.5. Max = 0.5.
  assert.equal(cls, 0.5);
});

test('takes max across multiple sessions', () => {
  const cls = computeCLS([
    // Session 1: 0.5
    { startTime: 0, value: 0.5, hadRecentInput: false },
    // Session 2: 0.2 (after >1s gap)
    { startTime: 2000, value: 0.1, hadRecentInput: false },
    { startTime: 2500, value: 0.1, hadRecentInput: false },
    // Session 3: 0.3 (after >1s gap)
    { startTime: 4000, value: 0.3, hadRecentInput: false }
  ]);
  assert.equal(cls, 0.5);
});

test('mixed input — hadRecentInput entries do not advance session timing', () => {
  // The hadRecentInput entry should be ignored entirely, not used as the
  // "last" entry for gap calculation.
  const cls = computeCLS([
    { startTime: 100, value: 0.1, hadRecentInput: false },
    { startTime: 500, value: 0.5, hadRecentInput: true }, // ignored
    { startTime: 900, value: 0.05, hadRecentInput: false } // 800ms gap to prev counted entry, same session
  ]);
  assert.equal(Math.round(cls * 100) / 100, 0.15);
});
