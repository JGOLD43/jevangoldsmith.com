import { readingSecondsInWindow, readingWindow, type HomeReadingStats, type ReadingRecord } from '../domain/home-reading';
import { getDatabase } from './database';

export async function getHomeReadingStats(now = new Date()): Promise<HomeReadingStats> {
  const database = await getDatabase();
  const { today, week } = readingWindow(now);
  const [sessions, highlights] = await Promise.all([
    database.getAllAsync<ReadingRecord>('SELECT started_at, duration_seconds FROM reading_sessions'),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM book_annotations WHERE kind='highlight' AND created_at >= ? AND created_at <= ?",
      today.toISOString(), now.toISOString(),
    ),
  ]);
  return {
    todaySeconds: readingSecondsInWindow(sessions, today, now),
    lastSevenDaysSeconds: readingSecondsInWindow(sessions, week, now),
    todayHighlights: highlights?.count ?? 0,
  };
}
