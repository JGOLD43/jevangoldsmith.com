import { getDatabase } from './database';
import { EMPTY_CALENDAR, type CalendarPreferences } from '@/domain/life-calendar';
export async function readCalendarPreferences(): Promise<CalendarPreferences> {
  const db = await getDatabase();
  await db.execAsync('CREATE TABLE IF NOT EXISTS life_calendar_settings (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL)');
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM life_calendar_settings WHERE id = 1');
  return row ? { ...EMPTY_CALENDAR, ...JSON.parse(row.value) } : { ...EMPTY_CALENDAR, intentions: {}, confirmations: {} };
}
export async function saveCalendarPreferences(value: CalendarPreferences) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO life_calendar_settings (id, value) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value', JSON.stringify(value));
}
