import type { DailyActivity } from './models';

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function activityDateKey(value: string): string | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  const named = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(trimmed);
  const parts = iso
    ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
    : named
      ? { year: Number(named[3]), month: MONTHS.indexOf(named[1].toLowerCase()) + 1, day: Number(named[2]) }
      : null;
  if (!parts || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day, 12);
  if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day) return null;
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function shiftedDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

function dayDistance(left: string, right: string): number {
  return Math.round((new Date(`${right}T12:00:00`).getTime() - new Date(`${left}T12:00:00`).getTime()) / 86_400_000);
}

export function activityStreaks(days: string[], today = dateKey(new Date())) {
  const unique = [...new Set(days)].sort();
  let longest = 0;
  let run = 0;
  let previous = '';
  for (const day of unique) {
    run = previous && dayDistance(previous, day) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const latest = unique.at(-1);
  const current = latest === today || latest === shiftedDay(today, -1) ? (() => {
    let count = 1;
    for (let index = unique.length - 2; index >= 0; index -= 1) {
      if (dayDistance(unique[index], unique[index + 1]) !== 1) break;
      count += 1;
    }
    return count;
  })() : 0;
  return { current, longest, activeDays: unique.length };
}

function weekStart(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return dateKey(date);
}

export function activityWeekStreaks(days: string[], today = dateKey(new Date())) {
  const weeks = [...new Set(days.map(weekStart))].sort();
  const currentWeek = weekStart(today);
  const previousWeek = shiftedDay(currentWeek, -7);
  let longest = 0;
  let run = 0;
  for (let index = 0; index < weeks.length; index += 1) {
    run = index > 0 && dayDistance(weeks[index - 1], weeks[index]) === 7 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const latest = weeks.at(-1);
  let current = 0;
  if (latest === currentWeek || latest === previousWeek) {
    current = 1;
    for (let index = weeks.length - 2; index >= 0; index -= 1) {
      if (dayDistance(weeks[index], weeks[index + 1]) !== 7) break;
      current += 1;
    }
  }
  return { current, longest, activeWeeks: weeks.length };
}

export function mergeDailyActivity(entries: DailyActivity[]): DailyActivity[] {
  const merged = new Map<string, DailyActivity>();
  for (const entry of entries) {
    const current = merged.get(entry.date) ?? { date: entry.date, value: 0, count: 0 };
    merged.set(entry.date, { date: entry.date, value: current.value + entry.value, count: current.count + entry.count });
  }
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}
