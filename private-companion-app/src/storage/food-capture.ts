import { getDatabase } from "./database";
import { withVaultTransaction } from "./vault-transaction";
import { trackPendingSave } from "@/services/save-queue";
import { notifySyncedData } from "@/services/device-sync-events";
import {
  FOOD_CAPTURE_PREFIX,
  validateFoodCapture,
  type FoodCapture,
} from "@/domain/food-capture";

export async function saveFoodCapture(
  capture: FoodCapture,
): Promise<FoodCapture> {
  validateFoodCapture(capture);
  await getDatabase();
  const saved = await trackPendingSave(
    withVaultTransaction(async (db) => {
      const rows = await db.getAllAsync<{ id: string; value: string }>(
        "SELECT id,value FROM knowledge_preferences WHERE substr(id,1,?)=?",
        FOOD_CAPTURE_PREFIX.length,
        FOOD_CAPTURE_PREFIX,
      );
      const current = rows.find(
        (r) => r.id === FOOD_CAPTURE_PREFIX + capture.id,
      );
      const old: FoodCapture | null = current
        ? JSON.parse(current.value)
        : null;
      if (old) {
        // A committed capture may be retried after the draft-clear acknowledgement
        // was interrupted. Acknowledge the immutable packet without changing it.
        if (
          capture.status === "pending" &&
          old.createdAt === capture.createdAt &&
          old.day === capture.day &&
          old.meal === capture.meal &&
          old.mode === capture.mode &&
          old.description === capture.description &&
          (old.photo === capture.photo || old.status !== "pending")
        )
          return old;
        if (
          old.updatedAt !== capture.updatedAt ||
          old.status !== "pending" ||
          capture.status !== "discarded"
        )
          throw Error(
            "This photo changed on another device. Reload the diary before changing it.",
          );
        if (
          old.createdAt !== capture.createdAt ||
          old.day !== capture.day ||
          old.meal !== capture.meal ||
          old.mode !== capture.mode ||
          old.description !== capture.description
        )
          throw Error(
            "Saved food captures keep their original details. Save a new capture instead.",
          );
      } else if (capture.status !== "pending")
        throw Error("Save this photo before changing its status.");
      const pending = rows
        .filter((r) => r.id !== FOOD_CAPTURE_PREFIX + capture.id)
        .map((r) => JSON.parse(r.value) as FoodCapture)
        .filter((r) => r.status === "pending");
      if (
        capture.status === "pending" &&
        (pending.length >= 5 ||
          pending.reduce(
            (sum, r) => sum + (r.photo?.length || 0),
            capture.photo?.length || 0,
          ) >
            5 * 1024 * 1024)
      )
        throw Error(
          "Five photos are already waiting. Review or discard one on your Mac before adding another.",
        );
      const next = {
        ...capture,
        updatedAt: new Date(
          Math.max(Date.now(), Date.parse(capture.updatedAt) + 1),
        ).toISOString(),
      };
      await db.runAsync(
        "INSERT INTO knowledge_preferences(id,value,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
        FOOD_CAPTURE_PREFIX + next.id,
        JSON.stringify(next),
        next.updatedAt,
      );
      return next;
    }),
  );
  notifySyncedData(["knowledge_preferences"]);
  return saved;
}
