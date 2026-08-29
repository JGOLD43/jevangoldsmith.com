import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { RelationshipContact } from '@/domain/models';

const CHANNEL_ID = 'relationship-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function prepareChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Relationship reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 220, 120, 220],
  });
}

async function cancelContactReminder(contactId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content.data?.relationshipContactId === contactId)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
}

export async function relationshipRemindersEnabled() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
}

export async function enableRelationshipReminders() {
  await prepareChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function syncRelationshipReminder(contact: RelationshipContact, requestPermission = false) {
  await prepareChannel();
  await cancelContactReminder(contact.id);
  if (!contact.nextFollowUpAt) return false;

  let enabled = await relationshipRemindersEnabled();
  if (!enabled && requestPermission) enabled = await enableRelationshipReminders();
  if (!enabled) return false;

  const date = new Date(contact.nextFollowUpAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to keep in touch',
      body: `Reach out to ${contact.name}.`,
      data: { relationshipContactId: contact.id, route: `/contacts/${contact.id}` },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
  return true;
}

export async function removeRelationshipReminder(contactId: string) {
  await cancelContactReminder(contactId);
}

export async function syncAllRelationshipReminders(contacts: RelationshipContact[]) {
  if (!await relationshipRemindersEnabled()) return;
  await prepareChannel();
  for (const contact of contacts) await syncRelationshipReminder(contact);
}
