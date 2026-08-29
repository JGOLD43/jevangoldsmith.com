import * as Crypto from 'expo-crypto';

import { activityStreaks, activityWeekStreaks } from '@/domain/activity';
import type { BookReadingStats, DailyActivity, LibraryReadingStats } from '@/domain/models';

import { getDatabase } from './database';

type SessionRow = { started_at: string; duration_seconds: number; local_day: string };

function localDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDay(date);
}

function streakFor(days: string[]): number {
  const unique = [...new Set(days)].sort().reverse();
  if (!unique.length) return 0;
  const today = dayOffset(0);
  const yesterday = dayOffset(-1);
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  let cursor = new Date(`${unique[0]}T12:00:00`);
  for (let index = 1; index < unique.length; index += 1) {
    cursor.setDate(cursor.getDate() - 1);
    if (unique[index] !== localDay(cursor)) break;
    streak += 1;
  }
  return streak;
}

export async function beginReadingSession(bookId: string): Promise<string> {
  const database = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'INSERT INTO reading_sessions (id, book_id, started_at, ended_at, duration_seconds, local_day) VALUES (?, ?, ?, NULL, 0, ?)',
      id, bookId, now, localDay(),
    );
    await database.runAsync(`UPDATE books SET last_opened_at=?, updated_at=?,
      reading_status=CASE WHEN reading_status='unread' THEN 'reading' ELSE reading_status END WHERE id=?`, now, now, bookId);
  });
  return id;
}

export async function heartbeatReadingSession(sessionId: string): Promise<void> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ started_at: string }>('SELECT started_at FROM reading_sessions WHERE id = ?', sessionId);
  if (!row) return;
  const duration = Math.max(0, Math.round((Date.now() - new Date(row.started_at).getTime()) / 1000));
  await database.runAsync('UPDATE reading_sessions SET ended_at=?, duration_seconds=? WHERE id=?', new Date().toISOString(), duration, sessionId);
}

export const endReadingSession = heartbeatReadingSession;

async function annotationCounts(bookId?: string): Promise<{ highlights: number; notes: number }> {
  const database = await getDatabase();
  const clause = bookId ? ' WHERE book_id = ?' : '';
  const args = bookId ? [bookId] : [];
  const rows = await database.getAllAsync<{ kind: string; count: number }>(
    `SELECT kind, COUNT(*) AS count FROM book_annotations${clause} GROUP BY kind`, ...args,
  );
  return {
    highlights: rows.find((row) => row.kind === 'highlight')?.count ?? 0,
    notes: rows.find((row) => row.kind === 'note')?.count ?? 0,
  };
}

export async function getBookReadingStats(bookId: string): Promise<BookReadingStats> {
  const database = await getDatabase();
  const sessions = await database.getAllAsync<SessionRow>(
    'SELECT started_at, duration_seconds, local_day FROM reading_sessions WHERE book_id=? ORDER BY started_at DESC', bookId,
  );
  const annotations = await annotationCounts(bookId);
  const activeSessions = sessions.filter((row) => row.duration_seconds > 0);
  return {
    bookId,
    totalSeconds: sessions.reduce((sum, row) => sum + row.duration_seconds, 0),
    todaySeconds: sessions.filter((row) => row.local_day === localDay()).reduce((sum, row) => sum + row.duration_seconds, 0),
    daysRead: new Set(activeSessions.map((row) => row.local_day)).size,
    sessionCount: sessions.length,
    highlightCount: annotations.highlights,
    noteCount: annotations.notes,
    currentStreak: streakFor(activeSessions.map((row) => row.local_day)),
    lastReadAt: sessions[0]?.started_at ?? null,
  };
}

export async function getLibraryReadingStats(): Promise<LibraryReadingStats> {
  const database = await getDatabase();
  const sessions = await database.getAllAsync<SessionRow>('SELECT started_at, duration_seconds, local_day FROM reading_sessions ORDER BY started_at DESC');
  const books = await database.getFirstAsync<{ started: number; finished: number }>(`SELECT
    SUM(CASE WHEN progress > 0 THEN 1 ELSE 0 END) AS started,
    SUM(CASE WHEN reading_status = 'finished' THEN 1 ELSE 0 END) AS finished FROM books`);
  const annotations = await annotationCounts();
  const activeSessions = sessions.filter((row) => row.duration_seconds > 0);
  const activityByDay = new Map<string, DailyActivity>();
  for (const session of activeSessions) {
    const existing = activityByDay.get(session.local_day) ?? { date: session.local_day, value: 0, count: 0 };
    activityByDay.set(session.local_day, {
      date: session.local_day,
      value: existing.value + session.duration_seconds,
      count: existing.count + 1,
    });
  }
  const dailyActivity = [...activityByDay.values()].sort((left, right) => left.date.localeCompare(right.date));
  const days = dailyActivity.map((activity) => activity.date);
  const dayStreaks = activityStreaks(days);
  const weekStreaks = activityWeekStreaks(days);
  const weekStart = dayOffset(-6);
  return {
    totalSeconds: sessions.reduce((sum, row) => sum + row.duration_seconds, 0),
    todaySeconds: sessions.filter((row) => row.local_day === localDay()).reduce((sum, row) => sum + row.duration_seconds, 0),
    lastSevenDaysSeconds: sessions.filter((row) => row.local_day >= weekStart).reduce((sum, row) => sum + row.duration_seconds, 0),
    daysRead: new Set(activeSessions.map((row) => row.local_day)).size,
    booksStarted: books?.started ?? 0,
    booksFinished: books?.finished ?? 0,
    highlightCount: annotations.highlights,
    currentStreak: dayStreaks.current,
    longestStreak: dayStreaks.longest,
    currentWeekStreak: weekStreaks.current,
    longestWeekStreak: weekStreaks.longest,
    sessionCount: sessions.length,
    dailyActivity,
  };
}

export function formatReadingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return totalSeconds > 0 ? '<1m' : '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
