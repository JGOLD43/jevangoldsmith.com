import { FOOD_CAPTURE_PREFIX as CAPTURE_PREFIX, validateFoodCapture as validateCapture, type FoodCapture as Capture } from "./food-capture";
import { HEALTH_PREFIX, validateHealth, type FoodEntry } from "./health.ts";

// Structural types keep this guard independent of the general sync module.
type PreferenceRow = Record<string, string | number | null>;
type CaptureSnapshot = { tables: Record<string, { rows: PreferenceRow[] }> };
const fields = new Set(["version", "id", "createdAt", "updatedAt", "day", "meal", "mode", "photo", "description", "status", "foodEntryId"]);
const immutableFields = ["id", "createdAt", "day", "meal", "mode", "description"] as const;
const priority = { pending: 0, discarded: 1, reviewed: 2 } as const;
const invalid = () => new Error("A synced food capture is invalid. Your existing data has been retained; update both apps and review the capture on its original device.");
const changed = () => new Error("The same food capture has different original details. Your data on both devices has been retained; keep the original capture and save changed details as a new capture.");

export function isFoodCaptureRow(row: PreferenceRow | undefined): boolean {
  return !!row && typeof row.id === "string" && row.id.startsWith(CAPTURE_PREFIX);
}

export function readFoodCaptureRow(row: PreferenceRow): Capture {
  let value: unknown;
  try { value = typeof row.value === "string" ? JSON.parse(row.value) : null; } catch { throw invalid(); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const capture = value as Capture;
  // Do these checks before legacy validators, which have different permissiveness.
  if (Object.keys(value).some(field => !fields.has(field)) ||
      typeof capture.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(capture.id) ||
      typeof capture.createdAt !== "string" || capture.createdAt.length > 100 || !Number.isFinite(Date.parse(capture.createdAt)) ||
      typeof capture.updatedAt !== "string" || capture.updatedAt.length > 100 || !Number.isFinite(Date.parse(capture.updatedAt)) ||
      Date.parse(capture.updatedAt) < Date.parse(capture.createdAt) ||
      typeof capture.day !== "string" || typeof capture.meal !== "string" || typeof capture.mode !== "string" || typeof capture.status !== "string" ||
      row.id !== CAPTURE_PREFIX + capture.id || row.updated_at !== capture.updatedAt ||
      (capture.photo !== null && (typeof capture.photo !== "string" || capture.photo.length > 900000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(capture.photo))) ||
      (capture.status === "pending" && capture.foodEntryId !== undefined) ||
      (capture.status !== "pending" && capture.photo !== null) ||
      (capture.status === "reviewed" && capture.foodEntryId !== capture.id) ||
      (capture.status === "discarded" && capture.foodEntryId !== undefined)) throw invalid();
  try { validateCapture(capture); } catch { throw invalid(); }
  return capture;
}

function assertImmutable(captures: Capture[]) {
  const original = captures[0];
  for (const capture of captures.slice(1)) {
    if (immutableFields.some(field => original[field] !== capture[field])) throw changed();
  }
  // Receipts erase the image. Compare all remaining pending copies, including
  // the ancestor, without ever restoring a receipt's erased photo.
  const pending = captures.filter(capture => capture.status === "pending");
  if (pending.some(capture => capture.photo !== pending[0].photo)) throw changed();
}

export function mergeFoodCaptureRows(...rows: (PreferenceRow | undefined)[]): PreferenceRow {
  const copies = rows.filter((row): row is PreferenceRow => !!row).map(row => ({ row, capture: readFoodCaptureRow(row) }));
  if (!copies.length) throw invalid();
  assertImmutable(copies.map(copy => copy.capture));
  // Logging a reviewed food wins a racing discard. Both beat any pending copy,
  // regardless of clock order or a generic sync conflict resolution.
  copies.sort((a, b) => priority[b.capture.status] - priority[a.capture.status] ||
    Date.parse(b.capture.updatedAt) - Date.parse(a.capture.updatedAt) ||
    (String(a.row.value) < String(b.row.value) ? 1 : String(a.row.value) > String(b.row.value) ? -1 : 0));
  return copies[0].row;
}

export function reviewedFoodPreferenceId(row: PreferenceRow): string | null {
  const capture = readFoodCaptureRow(row);
  return capture.status === "reviewed" ? HEALTH_PREFIX + capture.id : null;
}

export function assertReviewedFoodRow(row: PreferenceRow, preferenceId: string) {
  let value: unknown;
  try { value = typeof row.value === "string" ? JSON.parse(row.value) : null; } catch { throw invalid(); }
  const food = value as FoodEntry;
  if (!food || typeof food !== "object" || Array.isArray(food) || food.kind !== "food" ||
      typeof food.id !== "string" || preferenceId !== HEALTH_PREFIX + food.id || row.id !== preferenceId ||
      typeof food.updatedAt !== "string" || !Number.isFinite(Date.parse(food.updatedAt)) || row.updated_at !== food.updatedAt) throw invalid();
  // Use the record's day so a timezone change cannot invalidate an old receipt.
  try { validateHealth(food, food.day); } catch { throw invalid(); }
}

export function assertFoodCaptureSnapshot(snapshot: CaptureSnapshot) {
  const rows = snapshot.tables.knowledge_preferences?.rows ?? [];
  const byId = new Map(rows.map(row => [row.id, row]));
  let pending = 0, bytes = 0;
  for (const row of rows) {
    if (!isFoodCaptureRow(row)) {
      // A capture-shaped payload cannot hide under a different preference key.
      let value: unknown;
      try { value = typeof row.value === "string" ? JSON.parse(row.value) : null; } catch { continue; }
      if (value && typeof value === "object" && !Array.isArray(value) &&
          ["photo", "mode", "status", "createdAt", "meal", "description"].every(field => Object.prototype.hasOwnProperty.call(value, field))) throw invalid();
      continue;
    }
    const capture = readFoodCaptureRow(row);
    if (capture.status === "pending") { pending++; bytes += capture.photo?.length ?? 0; }
    if (capture.status === "reviewed") {
      const preferenceId = HEALTH_PREFIX + capture.id, food = byId.get(preferenceId);
      if (!food) throw new Error("A reviewed capture is missing its logged food. Your existing data has been retained; recover the complete saved receipt and food on its original device.");
      assertReviewedFoodRow(food, preferenceId);
    }
  }
  if (pending > 5 || bytes > 5 * 1024 * 1024)
    throw new Error("More than five food captures would be waiting after sync. Your data on both devices has been retained; review or discard a capture on either device before syncing again.");
}

export function assertFoodCaptureImport(before: CaptureSnapshot, after: CaptureSnapshot, restoring = false) {
  assertFoodCaptureSnapshot(before);
  assertFoodCaptureSnapshot(after);
  const next = new Map((after.tables.knowledge_preferences?.rows ?? []).filter(isFoodCaptureRow).map(row => [row.id, row]));
  for (const row of (before.tables.knowledge_preferences?.rows ?? []).filter(isFoodCaptureRow)) {
    const old = readFoodCaptureRow(row), incoming = next.get(row.id);
    if (!incoming) throw new Error("This change would remove a saved food capture or receipt. Your existing data has been retained; discard pending captures instead of deleting their records.");
    const capture = readFoodCaptureRow(incoming);
    assertImmutable([old, capture]);
    if (priority[capture.status] < priority[old.status] ||
        (restoring && old.status !== "pending" && old.status !== capture.status) ||
        (old.status === capture.status && Date.parse(capture.updatedAt) < Date.parse(old.updatedAt)))
      throw new Error("This change would replay an older food capture or receipt. Your existing data has been retained; choose a recovery point that preserves its current receipt.");
  }
}
