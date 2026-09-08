export type TimeEvent = { id: string; calendarId: string; title: string; start: string; end: string; allDay: boolean; lifeItemId?: string };
export type TimeIntention = { weeklyMinutes: number; why: string; cost: string };
export type TimeConfirmation = { lifeItemId: string; start: string; end: string };
export type CalendarPreferences = { calendarIds: string[]; writeCalendarId: string; intentions: Record<string, TimeIntention>; confirmations: Record<string, TimeConfirmation> };
export const EMPTY_CALENDAR: CalendarPreferences = { calendarIds: [], writeCalendarId: '', intentions: {}, confirmations: {} };
export function weekStart(date: Date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (start.getDay() + 6) % 7); return start;
}
export function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
export function dayKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function occurrenceKey(event: TimeEvent) { return `${event.calendarId}/${event.id}/${event.start}`; }
export function linkedItem(notes?: string | null) { const match = notes?.match(/\[JGOLD goal:([^\]\r\n]+)\]/); if (!match) return undefined; try { return decodeURIComponent(match[1]); } catch { return undefined; } }
// Union intervals: overlapping events must never create extra hours in the day.
export function occupiedMinutes(events: { start: string; end: string; allDay?: boolean }[], from: Date, to: Date) {
  const intervals = events.filter(e => !e.allDay).map(e => [Math.max(+new Date(e.start), +from), Math.min(+new Date(e.end), +to)]).filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s).sort((a, b) => a[0] - b[0]);
  let total = 0, end = -Infinity;
  for (const [start, stop] of intervals) { total += Math.max(0, stop - Math.max(start, end)); end = Math.max(end, stop); }
  return Math.round(total / 60000);
}
export function blockDates(day: Date, time: string, minutes: number) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match || +match[1] > 23 || +match[2] > 59 || !Number.isFinite(minutes) || minutes < 5 || minutes > 480) throw new Error('Choose a time from 00:00 to 23:59 and a duration of 5–480 minutes.');
  const start = new Date(day); start.setHours(+match[1], +match[2], 0, 0);
  if (start.getHours() !== +match[1] || start.getMinutes() !== +match[2]) throw new Error('That time is unavailable when the clocks change. Choose another time.');
  return { start, end: new Date(+start + minutes * 60000) };
}
export function gentleReview(title: string, intention: TimeIntention, planned: number, confirmed: number) {
  if (confirmed >= intention.weeklyMinutes) return `You’ve made time for ${title}. Take a moment to recognise that.`;
  const reason = intention.why.trim() ? ` You said this matters because ${intention.why.trim()}` : '';
  const cost = intention.cost.trim() ? ` Your note about putting it off: ${intention.cost.trim()}` : '';
  return `${planned < intention.weeklyMinutes ? `Would a small time block for ${title} help this week?` : `How is your time for ${title} going? You can confirm what you’ve done.`}${reason}${cost}`;
}
