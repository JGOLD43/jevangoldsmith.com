const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slugify, normalizePersonName } = require('../../scripts/_lib/slugify');

test('slugify: basic lowercase + dash', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('slugify: strips punctuation', () => {
  assert.equal(slugify('Foo, Bar & Baz!'), 'foo-bar-baz');
});

test('slugify: collapses runs of spaces and dashes', () => {
  assert.equal(slugify('foo    bar---baz'), 'foo-bar-baz');
});

test('slugify: empty input returns empty', () => {
  assert.equal(slugify(''), '');
});

test('normalizePersonName: basic', () => {
  assert.equal(normalizePersonName('Naval Ravikant'), 'naval-ravikant');
});

test('normalizePersonName: ampersand becomes "and"', () => {
  assert.equal(normalizePersonName('Ben & Jerry'), 'ben-and-jerry');
});

test('normalizePersonName: trims leading/trailing dashes', () => {
  assert.equal(normalizePersonName('  --foo--  '), 'foo');
});

test('normalizePersonName: null/undefined safe', () => {
  assert.equal(normalizePersonName(null), '');
  assert.equal(normalizePersonName(undefined), '');
});

test('normalizePersonName: lowercase', () => {
  assert.equal(normalizePersonName('DAVID OGILVY'), 'david-ogilvy');
});

test('normalizePersonName: punctuation stripped', () => {
  assert.equal(normalizePersonName("John O'Reilly"), 'john-o-reilly');
});
