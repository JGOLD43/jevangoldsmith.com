export type PracticeLog = { kind: 'practice' | 'study'; durationMs: number; createdAt: string };
export function validPracticeDuration(minutes: string): number {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0 || value > 720) throw new Error('Enter minutes between 0 and 720.');
  return Math.round(value * 60_000);
}
export function localPracticeDate(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}
export function summarisePractice(logs: PracticeLog[], at = new Date()) {
  const today = localPracticeDate(at);
  const weekStart = new Date(at.getFullYear(), at.getMonth(), at.getDate() - 6);
  let totalMs = 0, todayMs = 0, weekMs = 0, studyMs = 0;
  const days = new Map<string, { date: string; value: number; count: number }>();
  for (const log of logs) {
    if (!Number.isFinite(log.durationMs) || log.durationMs <= 0) continue;
    const date = new Date(log.createdAt);
    if (!Number.isFinite(date.getTime()) || date > at) continue;
    if (log.kind === 'study') { studyMs += log.durationMs; continue; }
    totalMs += log.durationMs;
    const day = localPracticeDate(date);
    if (day === today) todayMs += log.durationMs;
    if (date >= weekStart) weekMs += log.durationMs;
    const activity = days.get(day) ?? { date: day, value: 0, count: 0 };
    activity.value += log.durationMs / 60_000; activity.count += 1; days.set(day, activity);
  }
  return { totalMs, todayMs, weekMs, studyMs, activity: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}
