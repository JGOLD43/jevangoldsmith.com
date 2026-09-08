import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, blockDates, dayKey, gentleReview, linkedItem, occupiedMinutes, occurrenceKey, weekStart } from '../src/domain/life-calendar.ts';
process.env.TZ = 'Australia/Brisbane';
test('calendar week is local Monday through Sunday, including year boundaries', () => {
  const start = weekStart(new Date('2027-01-03T16:00:00+10:00'));
  assert.equal(dayKey(start), '2026-12-28');
  assert.equal(dayKey(addDays(start, 7)), '2027-01-04');
});
test('scheduled time unions overlaps, clips midnight, excludes all-day and malformed events', () => {
  const from = new Date('2026-09-08T00:00:00+10:00'); const to = addDays(from, 1);
  const e = (start, end, allDay = false) => ({ start, end, allDay });
  assert.equal(occupiedMinutes([
    e('2026-09-07T23:30:00+10:00', '2026-09-08T01:00:00+10:00'),
    e('2026-09-08T00:30:00+10:00', '2026-09-08T02:00:00+10:00'),
    e('2026-09-08T00:00:00+10:00', '2026-09-09T00:00:00+10:00', true),
    e('bad', 'bad'), e('2026-09-08T04:00:00+10:00', '2026-09-08T03:00:00+10:00'),
  ], from, to), 120);
});
test('time blocks validate clock and duration and cross midnight correctly', () => {
  const day = new Date('2026-09-08T12:00:00+10:00');
  for (const time of ['24:00', '12:60', 'abc', '-1:00']) assert.throws(() => blockDates(day, time, 30));
  for (const minutes of [0, -2, 481, NaN]) assert.throws(() => blockDates(day, '12:00', minutes));
  const result = blockDates(day, '23:45', 30);
  assert.equal(dayKey(result.end), '2026-09-09');
  assert.equal(result.end.getMinutes(), 15);
});
test('calendar goal markers tolerate edited notes and reject invalid encoding', () => {
  assert.equal(linkedItem('My notes\n[JGOLD goal:abc%2F123]'), 'abc/123');
  assert.equal(linkedItem('[JGOLD goal:%ZZ]'), undefined);
  assert.equal(linkedItem('learning'), undefined);
});
test('recurring occurrences and calendars never share completion state', () => {
  const event = { id: 'one', calendarId: 'a', start: '2026-09-08' };
  assert.notEqual(occurrenceKey(event), occurrenceKey({ ...event, start: '2026-09-15' }));
  assert.notEqual(occurrenceKey(event), occurrenceKey({ ...event, calendarId: 'b' }));
});
test('encouragement distinguishes planned from done and uses only chosen reasons', () => {
  const intention = { weeklyMinutes: 60, why: 'I want to learn', cost: 'I may delay my course' };
  const missing = gentleReview('Study', intention, 0, 0);
  assert.match(missing, /Would a small time block/); assert.match(missing, /I may delay my course/);
  assert.doesNotMatch(missing, /failed|did nothing|you missed/i);
  assert.match(gentleReview('Study', intention, 90, 0), /confirm what you’ve done/);
  assert.match(gentleReview('Study', intention, 0, 60), /recognise/);
  assert.doesNotMatch(gentleReview('Study', { ...intention, why: '', cost: '' }, 0, 0), /because|putting it off/);
});

import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';
import { EMPTY_CALENDAR } from '../src/domain/life-calendar.ts';
function loadService(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', ...Object.keys(dependencies), js)(exports, ...Object.values(dependencies));
  return exports;
}
test('calendar settings persist private reasons and confirmations across reloads', async () => {
  const db = new DatabaseSync(':memory:');
  const service = loadService('../src/storage/life-calendar.ts', { EMPTY_CALENDAR, getDatabase: async () => ({ execAsync: async sql => db.exec(sql), getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args), runAsync: async (sql, ...args) => db.prepare(sql).run(...args) }) });
  assert.deepEqual(await service.readCalendarPreferences(), EMPTY_CALENDAR);
  const prefs = { ...EMPTY_CALENDAR, calendarIds: ['google'], writeCalendarId: 'google', intentions: { goal: { weeklyMinutes: 60, why: 'Private reason', cost: 'Private consequence' } }, confirmations: { occurrence: { lifeItemId: 'goal', start: '2026-09-08', end: '2026-09-09' } } };
  await service.saveCalendarPreferences(prefs);
  assert.deepEqual(await service.readCalendarPreferences(), prefs);
  db.close();
});
test('creating a block checks write access and sends no private reasons or attendees', async () => {
  let payload;
  const Calendar = { EntityTypes: { EVENT: 'event' }, getCalendarsAsync: async () => [{ id: 'google', allowsModifications: true }, { id: 'holidays', allowsModifications: false }], createEventAsync: async (...args) => { payload = args; return 'event-id'; } };
  const service = loadService('../src/services/life-calendar.ts', { Calendar, Notifications: {}, linkedItem });
  const item = { id: 'goal', title: 'Study', why: 'private', cost: 'private' };
  const start = new Date('2026-09-09T18:00:00+10:00'), end = new Date('2026-09-09T18:30:00+10:00');
  await assert.rejects(service.createTimeBlock('holidays', item, start, end));
  await assert.rejects(service.createTimeBlock('deleted', item, start, end));
  assert.equal(await service.createTimeBlock('google', item, start, end), 'event-id');
  assert.deepEqual(payload, ['google', { title: 'Study', startDate: start, endDate: end, notes: '[JGOLD goal:goal]', alarms: [{ relativeOffset: -10 }] }]);
});
test('calendar refresh reflects moved events and ignores cancelled events', async () => {
  const Calendar = { EventStatus: { CANCELED: 'canceled' }, getEventsAsync: async () => [{ id: 'one', calendarId: 'google', title: 'Moved', startDate: '2026-09-09T19:00:00Z', endDate: '2026-09-09T19:30:00Z', notes: '[JGOLD goal:goal]' }, { status: 'canceled' }] };
  const service = loadService('../src/services/life-calendar.ts', { Calendar, Notifications: {}, linkedItem });
  const events = await service.calendarEvents(['google'], new Date(), new Date());
  assert.equal(events.length, 1); assert.equal(events[0].lifeItemId, 'goal'); assert.equal(events[0].start, '2026-09-09T19:00:00.000Z');
  assert.deepEqual(await service.calendarEvents([], new Date(), new Date()), []);
});

test('a private link follows an event when its time changes', async () => {
  const { eventLinkKey } = await import('../src/domain/life-calendar.ts');
  assert.equal(eventLinkKey({ id: 'same', calendarId: 'google', start: 'before' }), eventLinkKey({ id: 'same', calendarId: 'google', start: 'after' }));
  assert.notEqual(eventLinkKey({ id: 'same', calendarId: 'work' }), eventLinkKey({ id: 'same', calendarId: 'personal' }));
});
