import { getDatabase } from "./database";
import { withVaultTransaction } from "./vault-transaction";
import { trackPendingSave } from "@/services/save-queue";
import { notifySyncedData } from "@/services/device-sync-events";
import {
  HEALTH_PREFIX,
  validateHealthChange,
  type HealthRecord,
} from "@/domain/health";

export async function loadHealth(id: string): Promise<HealthRecord | null> {
  const row = await (
    await getDatabase()
  ).getFirstAsync<{ value: string }>(
    "SELECT value FROM knowledge_preferences WHERE id=?",
    HEALTH_PREFIX + id,
  );
  return row ? JSON.parse(row.value) : null;
}
export async function saveHealth(record: HealthRecord): Promise<HealthRecord> {
  await getDatabase();
  const saved = await trackPendingSave(
    withVaultTransaction(async (db) => {
      const row = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM knowledge_preferences WHERE id=?",
        HEALTH_PREFIX + record.id,
      );
      validateHealthChange(record, row ? JSON.parse(row.value) : null);
      const next = {
        ...record,
        updatedAt: new Date(
          Math.max(Date.now(), (Date.parse(record.updatedAt) || 0) + 1),
        ).toISOString(),
      };
      await db.runAsync(
        "INSERT INTO knowledge_preferences(id,value,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
        HEALTH_PREFIX + record.id,
        JSON.stringify(next),
        next.updatedAt,
      );
      return next;
    }),
  );
  notifySyncedData(["knowledge_preferences"]);
  return saved;
}
