import * as Calendar from 'expo-calendar/legacy';
import * as Notifications from 'expo-notifications';
import { linkedItem, type TimeEvent } from '@/domain/life-calendar';
export type PhoneCalendar = Calendar.Calendar;
export async function calendarAccess(request = false) {
  const permission = request ? await Calendar.requestCalendarPermissionsAsync() : await Calendar.getCalendarPermissionsAsync();
  return permission.granted;
}
export async function phoneCalendars() { return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT); }
export async function calendarEvents(ids: string[], from: Date, to: Date): Promise<TimeEvent[]> {
  if (!ids.length) return [];
  const events = await Calendar.getEventsAsync(ids, from, to);
  return events.filter(e => e.status !== Calendar.EventStatus.CANCELED).map(e => ({ id: e.id, calendarId: e.calendarId, title: e.title || 'Untitled event', start: new Date(e.startDate).toISOString(), end: new Date(e.endDate).toISOString(), allDay: !!e.allDay, lifeItemId: linkedItem(e.notes) })).sort((a, b) => a.start.localeCompare(b.start));
}
export async function createTimeBlock(calendarId: string, item: { id: string; title: string }, start: Date, end: Date) {
  const calendars = await phoneCalendars();
  if (!calendars.some(c => c.id === calendarId && c.allowsModifications)) throw new Error('Choose an available calendar that allows new events.');
  // Reasons and consequences stay in the encrypted vault, never in shared calendars.
  return Calendar.createEventAsync(calendarId, { title: item.title, startDate: start, endDate: end, notes: `[JGOLD goal:${encodeURIComponent(item.id)}]`, alarms: [{ relativeOffset: -10 }] });
}
export async function openTimeEvent(id: string) { await Calendar.openEventInCalendarAsync({ id }); }
const REVIEW_ID = 'jgold-weekly-time-review';
export async function weeklyReviewEnabled() { return (await Notifications.getAllScheduledNotificationsAsync()).some(n => n.identifier === REVIEW_ID); }
export async function setWeeklyReview(enabled: boolean) {
  if (!enabled) { await Notifications.cancelScheduledNotificationAsync(REVIEW_ID); return; }
  await Notifications.setNotificationChannelAsync('life-time', { name: 'Time for what matters', importance: Notifications.AndroidImportance.DEFAULT });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow notifications in phone settings to receive your weekly check-in.');
  await Notifications.scheduleNotificationAsync({ identifier: REVIEW_ID, content: { title: 'A little space for what matters', body: 'How did your week feel? Check in with your goals and make room for one small next step.', data: { route: '/' } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0, channelId: 'life-time' } });
}
