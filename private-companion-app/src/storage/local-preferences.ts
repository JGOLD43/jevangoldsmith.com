import { getDatabase } from "./database";

// Device-only settings and transient drafts stay inside the encrypted vault.
// This table intentionally is not in the device-sync table allowlist.
async function table() {
  const db = await getDatabase();
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS local_preferences (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
  );
  return db;
}
export async function readLocalPreference<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const row = await (
    await table()
  ).getFirstAsync<{ value: string }>(
    "SELECT value FROM local_preferences WHERE id=?",
    key,
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
export async function writeLocalPreference(key: string, value: unknown) {
  await (
    await table()
  ).runAsync(
    "INSERT INTO local_preferences (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value=excluded.value WHERE value<>excluded.value",
    key,
    JSON.stringify(value),
  );
}
