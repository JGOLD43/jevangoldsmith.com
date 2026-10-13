import { getDatabase } from "./database";
import { notifySyncedData } from "@/services/device-sync-events";
export type KnowledgePreference<T> = {
  id: string;
  value: T;
  updatedAt: string;
};
export async function listKnowledgePreferences<T>(
  prefix: string,
): Promise<KnowledgePreference<T>[]> {
  const rows = await (
    await getDatabase()
  ).getAllAsync<{ id: string; value: string; updated_at: string }>(
    "SELECT * FROM knowledge_preferences WHERE substr(id, 1, ?) = ? ORDER BY updated_at DESC",
    prefix.length,
    prefix,
  );
  return rows.map((row) => ({
    id: row.id,
    value: JSON.parse(row.value) as T,
    updatedAt: row.updated_at,
  }));
}
export async function writeKnowledgePreference(id: string, value: unknown) {
  await (
    await getDatabase()
  ).runAsync(
    "INSERT INTO knowledge_preferences (id, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
    id,
    JSON.stringify(value),
    new Date().toISOString(),
  );
  notifySyncedData(["knowledge_preferences"]);
}
export async function deleteKnowledgePreference(id: string) {
  await (
    await getDatabase()
  ).runAsync("DELETE FROM knowledge_preferences WHERE id=?", id);
  notifySyncedData(["knowledge_preferences"]);
}
