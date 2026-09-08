export type HomeReadingStats = { todaySeconds: number; lastSevenDaysSeconds: number; todayHighlights: number };
export type ReadingRecord = { started_at: string; duration_seconds: number };

export function readingWindow(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(week.getDate() - 6);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, week, tomorrow };
}

export function readingSecondsInWindow(records: ReadingRecord[], start: Date, end: Date): number {
  return records.reduce((total, record) => {
    const began = Date.parse(record.started_at);
    const duration = record.duration_seconds;
    if (!Number.isFinite(began) || !Number.isFinite(duration) || duration <= 0) return total;
    const overlap = Math.min(began + duration * 1000, end.getTime()) - Math.max(began, start.getTime());
    return total + Math.max(0, overlap / 1000);
  }, 0);
}

export function readingMinutes(seconds: number): string {
  if (seconds > 0 && seconds < 60) return '<1';
  return Math.floor(Math.max(0, seconds) / 60).toLocaleString();
}
