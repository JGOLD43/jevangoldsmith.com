const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateIsbn, validateUrl, validateYear, validateDate } = require('../../scripts/_lib/validators');

test('validateIsbn: null/empty passes', () => {
  assert.equal(validateIsbn(null), null);
  assert.equal(validateIsbn(''), null);
});

test('validateIsbn: valid ISBN-13', () => {
  assert.equal(validateIsbn('9780471244738'), null);
});

test('validateIsbn: valid ISBN-10', () => {
  assert.equal(validateIsbn('0140152601'), null);
});

test('validateIsbn: ISBN-10 with X check digit', () => {
  assert.equal(validateIsbn('047110175X'), null);
});

test('validateIsbn: hyphens allowed', () => {
  assert.equal(validateIsbn('978-0-471-24473-8'), null);
});

test('validateIsbn: rejects letters', () => {
  assert.match(validateIsbn('not-an-isbn') || '', /malformed/);
});

test('validateIsbn: rejects wrong length', () => {
  assert.match(validateIsbn('123456789012') || '', /10 or 13 digits/);
});

test('validateUrl: null/empty passes', () => {
  assert.equal(validateUrl(null, 'url'), null);
  assert.equal(validateUrl('', 'url'), null);
});

test('validateUrl: # is a noop', () => {
  assert.equal(validateUrl('#', 'href'), null);
});

test('validateUrl: https accepted', () => {
  assert.equal(validateUrl('https://example.com/x', 'url'), null);
});

test('validateUrl: protocol-relative accepted', () => {
  assert.equal(validateUrl('//cdn.example.com/x', 'url'), null);
});

test('validateUrl: root-relative accepted', () => {
  assert.equal(validateUrl('/books/foo.html', 'href'), null);
});

test('validateUrl: images/ path accepted', () => {
  assert.equal(validateUrl('images/people/x-400.jpg', 'image'), null);
});

test('validateUrl: rejects gopher scheme', () => {
  assert.match(validateUrl('gopher://bad', 'url') || '', /doesn't look like/);
});

test('validateUrl: rejects bare string', () => {
  assert.match(validateUrl('not a url at all', 'url') || '', /doesn't look like/);
});

test('validateYear: null/empty passes', () => {
  assert.equal(validateYear(null), null);
  assert.equal(validateYear(''), null);
});

test('validateYear: numeric in range', () => {
  assert.equal(validateYear(2023), null);
  assert.equal(validateYear('1995'), null);
});

test('validateYear: rejects non-numeric', () => {
  assert.match(validateYear('banana') || '', /not numeric/);
});

test('validateYear: rejects below range', () => {
  assert.match(validateYear(800) || '', /out of range/);
});

test('validateYear: rejects above range', () => {
  assert.match(validateYear(2500) || '', /out of range/);
});

test('validateDate: null/empty passes', () => {
  assert.equal(validateDate(null, 'date'), null);
});

test('validateDate: ISO date valid', () => {
  assert.equal(validateDate('2024-01-15', 'date'), null);
});

test('validateDate: unparseable returns error', () => {
  const res = validateDate('not-a-date', 'date');
  assert.ok(res?.error, 'expected error object');
  assert.match(res.error, /not a parseable date/);
});

test('validateDate: future date warns when warnFuture set', () => {
  const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const res = validateDate(future, 'published', { warnFuture: true });
  assert.ok(res?.warning, 'expected warning');
  assert.match(res.warning, /in the future/);
});

test('validateDate: past date passes even with warnFuture', () => {
  assert.equal(validateDate('2020-01-01', 'published', { warnFuture: true }), null);
});
