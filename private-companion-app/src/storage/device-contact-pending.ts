import { getDatabase } from './database';
async function database() {
  const db = await getDatabase();
  await db.execAsync('CREATE TABLE IF NOT EXISTS device_contact_pending (contact_id TEXT PRIMARY KEY NOT NULL)');
  return db;
}
export async function pendingDeviceContacts(): Promise<Set<string>> {
  return new Set((await (await database()).getAllAsync<{ contact_id: string }>('SELECT contact_id FROM device_contact_pending')).map(row => row.contact_id));
}
export async function clearPendingDeviceContact(id: string) {
  await (await database()).runAsync('DELETE FROM device_contact_pending WHERE contact_id = ?', id);
}
