import { getDatabase } from "./database";
import { withVaultTransaction } from "./vault-transaction";
import { trackPendingSave } from "@/services/save-queue";
import { notifySyncedData } from "@/services/device-sync-events";
import {
  DIET_TEMPLATE_PREFIX,
  DIET_SETTINGS_PREFIX,
  validateComponents,
  type DietTemplate,
  type DietSettings,
} from "@/domain/diet";

export async function saveDietRecord<T extends DietTemplate | DietSettings>(
  record: T,
): Promise<T> {
  const template = "components" in record,
    prefix = template ? DIET_TEMPLATE_PREFIX : DIET_SETTINGS_PREFIX;
  if (record.version !== 1 || !/^[\w-]{1,100}$/.test(record.id))
    throw Error("Check this food record.");
  if (template) {
    const r = record as DietTemplate;
    if (
      typeof r.title !== "string" ||
      !r.title.trim() ||
      r.title.length > 300 ||
      typeof r.archived !== "boolean"
    )
      throw Error("Give the saved meal a name.");
    validateComponents(r.components);
  } else {
    const r = record as DietSettings;
    if (
      r.id !== "personal" ||
      !r.goals ||
      ["calories", "protein", "carbs", "fat"].some((k) => {
        const v = r.goals[k as keyof typeof r.goals];
        return (
          v !== null &&
          (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 100000)
        );
      })
    )
      throw Error(
        "Goals are optional. Enter positive numbers or leave them blank.",
      );
  }
  await getDatabase();
  const saved = await trackPendingSave(
    withVaultTransaction(async (db) => {
      const row = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM knowledge_preferences WHERE id=?",
        prefix + record.id,
      );
      const current = row ? JSON.parse(row.value) : null;
      if ((current?.updatedAt || "") !== record.updatedAt)
        throw Error(
          "This record changed on another screen or device. Reload it before saving.",
        );
      const next = {
        ...record,
        updatedAt: new Date(
          Math.max(Date.now(), (Date.parse(record.updatedAt) || 0) + 1),
        ).toISOString(),
      };
      await db.runAsync(
        "INSERT INTO knowledge_preferences(id,value,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
        prefix + record.id,
        JSON.stringify(next),
        next.updatedAt,
      );
      return next;
    }),
  );
  notifySyncedData(["knowledge_preferences"]);
  return saved as T;
}
