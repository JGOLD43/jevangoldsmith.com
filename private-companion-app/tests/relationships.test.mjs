import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('People is a private on-device relationship workspace with follow-ups and conversation history', async () => {
  const database = await source('src/storage/database.ts');
  const repository = await source('src/storage/repository.ts');
  const context = await source('src/state/app-context.tsx');
  const people = await source('src/app/contacts/index.tsx');
  const profile = await source('src/app/contacts/[id].tsx');
  const reminders = await source('src/services/relationship-reminders.ts');
  const appConfig = await source('app.json');

  assert.match(database, /CREATE TABLE IF NOT EXISTS relationship_contacts/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS relationship_interactions/);
  assert.match(database, /REFERENCES relationship_contacts\(id\) ON DELETE CASCADE/);
  assert.match(repository, /addRelationshipInteraction/);
  assert.match(repository, /nextFollowUpAt/);
  assert.match(context, /listRelationshipContacts/);
  assert.match(context, /setContacts\(\[\]\)/);
  assert.match(people, /PERSONAL CRM/);
  assert.match(people, /Search people, notes or groups/);
  assert.match(people, /Keep in touch/);
  assert.match(people, /Agenda/);
  assert.match(people, /Smart views/);
  assert.match(people, /Import from phone/);
  assert.match(people, /existingEmails/);
  assert.match(people, /nextFollowUpAt: null/);
  assert.match(people, /Recently contacted/);
  assert.match(reminders, /scheduleNotificationAsync/);
  assert.match(reminders, /relationshipContactId/);
  assert.match(reminders, /getAllScheduledNotificationsAsync/);
  assert.match(context, /syncRelationshipReminder/);
  assert.match(appConfig, /expo-notifications/);
  assert.match(profile, /Log a conversation/);
  assert.match(profile, /Relationship history/);
});
