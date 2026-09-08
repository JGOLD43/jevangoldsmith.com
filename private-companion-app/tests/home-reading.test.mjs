import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { readingWindow, readingSecondsInWindow, readingMinutes } from '../src/domain/home-reading.ts';
process.env.TZ = 'Australia/Brisbane';

test('Home splits midnight reading and excludes old and future records', () => {
  const now = new Date('2026-09-08T12:00:00+10:00');
  const { today, week } = readingWindow(now);
  assert.equal(today.toISOString(), '2026-09-07T14:00:00.000Z');
  assert.equal(week.toISOString(), '2026-09-01T14:00:00.000Z');
  const records = [
    { started_at: '2026-09-07T23:59:00+10:00', duration_seconds: 120 },
    { started_at: '2026-09-02T10:00:00+10:00', duration_seconds: 120 },
    { started_at: '2026-09-01T10:00:00+10:00', duration_seconds: 600 },
    { started_at: '2026-09-09T10:00:00+10:00', duration_seconds: 600 },
    { started_at: 'invalid', duration_seconds: 600 },
  ];
  assert.equal(readingSecondsInWindow(records, today, now), 60);
  assert.equal(readingSecondsInWindow(records, week, now), 240);
});

test('Home displays minutes without rounding up or converting to hours', () => {
  assert.equal(readingMinutes(0), '0');
  assert.equal(readingMinutes(59), '<1');
  assert.equal(readingMinutes(119), '1');
  assert.equal(readingMinutes(5400), '90');
});

test('Home queries only highlights created today and reads fresh counts', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE reading_sessions (started_at TEXT, duration_seconds REAL); CREATE TABLE book_annotations (kind TEXT, created_at TEXT);');
  const insert = db.prepare('INSERT INTO book_annotations VALUES (?, ?)');
  insert.run('highlight', '2026-09-07T14:00:00.000Z');
  insert.run('highlight', '2026-09-08T01:00:00.000Z');
  insert.run('highlight', '2026-09-07T13:59:59.000Z');
  insert.run('highlight', '2026-09-09T00:00:00.000Z');
  insert.run('note', '2026-09-08T01:00:00.000Z');
  const source = readFileSync(new URL('../src/storage/home-reading.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', 'getDatabase', 'readingWindow', 'readingSecondsInWindow', js)(exports, async () => ({
    getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
    getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args),
  }), readingWindow, readingSecondsInWindow);
  const now = new Date('2026-09-08T12:00:00+10:00');
  assert.equal((await exports.getHomeReadingStats(now)).todayHighlights, 2);
  insert.run('highlight', '2026-09-08T01:30:00.000Z');
  assert.equal((await exports.getHomeReadingStats(now)).todayHighlights, 3);
  db.close();
});
