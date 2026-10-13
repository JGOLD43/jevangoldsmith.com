import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  bodyText,
  readDocument,
  writeDocument,
} from "@/domain/studio-document.cjs";
import {
  describeDocumentChange,
  normaliseMetadata,
  readMetadata,
} from "@/domain/document-history";
import type {
  EssayDocument,
  EssayRevision,
  EssayRevisionReason,
  NewEssayDocument,
} from "@/domain/models";
import { getDatabase } from "./database";
import { withVaultTransaction } from "./vault-transaction";
import { linkedCheckboxes, updateCheckboxes } from "@/domain/linked-checkboxes";
import type { ActionTask, ActionBoard } from "@/domain/action-board";

type DocumentRow = {
  id: string;
  source_id: string | null;
  title: string;
  summary: string;
  body: string;
  collection_name: string;
  visibility: EssayDocument["visibility"];
  created_at: string;
  updated_at: string;
  metadata_json: string;
  deleted_at: string | null;
};
type RevisionRow = {
  id: string;
  essay_id: string;
  sequence: number;
  title: string;
  summary: string;
  body: string;
  character_count: number;
  change_size: number;
  reason: EssayRevisionReason;
  created_at: string;
  collection_name: string | null;
  visibility: EssayDocument["visibility"] | null;
  source_id: string | null;
  metadata_json: string | null;
  deleted_at: string | null;
  device_id: string;
  parent_id: string | null;
  change_summary: string;
};
function document(row: DocumentRow): EssayDocument {
  return {
    id: row.id,
    sourceId: row.source_id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    collectionName: row.collection_name,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: readMetadata(row.metadata_json),
    deletedAt: row.deleted_at,
  };
}
function revision(row: RevisionRow): EssayRevision {
  return {
    id: row.id,
    essayId: row.essay_id,
    sequence: row.sequence,
    title: row.title,
    summary: row.summary,
    body: row.body,
    characterCount: row.character_count,
    changeSize: row.change_size,
    reason: row.reason,
    createdAt: row.created_at,
    collectionName: row.collection_name,
    visibility: row.visibility,
    sourceId: row.source_id,
    metadata:
      row.metadata_json === null ? undefined : readMetadata(row.metadata_json),
    deletedAt: row.deleted_at,
    deviceId: row.device_id,
    parentId: row.parent_id,
    changeSummary: row.change_summary,
  };
}
async function appendRevision(
  db: SQLiteDatabase,
  before: EssayDocument | null,
  next: EssayDocument,
  reason: EssayRevisionReason,
) {
  await db.runAsync(
    "INSERT OR IGNORE INTO local_preferences (id, value) VALUES ('history-device', ?)",
    JSON.stringify(
      `${Platform.OS === "web" ? "Mac" : Platform.OS} ${Crypto.randomUUID().slice(0, 8)}`,
    ),
  );
  const device = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM local_preferences WHERE id='history-device'",
  );
  const latest = await db.getFirstAsync<{ id: string; sequence: number }>(
    "SELECT id, sequence FROM essay_revisions WHERE essay_id=? ORDER BY created_at DESC, id DESC LIMIT 1",
    next.id,
  );
  const maximum = await db.getFirstAsync<{ n: number }>(
    "SELECT COALESCE(MAX(sequence), 0) AS n FROM essay_revisions WHERE essay_id=?",
    next.id,
  );
  await db.runAsync(
    `INSERT INTO essay_revisions
    (id, essay_id, sequence, title, summary, body, character_count, change_size, reason, created_at,
     collection_name, visibility, source_id, metadata_json, deleted_at, device_id, parent_id, change_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Crypto.randomUUID(),
    next.id,
    (maximum?.n ?? 0) + 1,
    next.title,
    next.summary,
    next.body,
    bodyText(next.body).length,
    bodyText(next.body).length - (before ? bodyText(before.body).length : 0),
    reason,
    next.updatedAt,
    next.collectionName,
    next.visibility,
    next.sourceId,
    JSON.stringify(normaliseMetadata(next.metadata)),
    next.deletedAt ?? null,
    JSON.parse(device!.value),
    latest?.id ?? null,
    describeDocumentChange(before, next),
  );
}
async function write(
  db: SQLiteDatabase,
  before: EssayDocument,
  next: EssayDocument,
  reason: EssayRevisionReason,
) {
  await db.runAsync(
    `UPDATE essay_documents SET source_id=?, title=?, summary=?, body=?, collection_name=?, visibility=?, metadata_json=?, deleted_at=?, updated_at=? WHERE id=?`,
    next.sourceId,
    next.title,
    next.summary,
    next.body,
    next.collectionName,
    next.visibility,
    JSON.stringify(normaliseMetadata(next.metadata)),
    next.deletedAt ?? null,
    next.updatedAt,
    next.id,
  );
  await appendRevision(db, before, next, reason);
  const checks = linkedCheckboxes(next.body),
    previousChecks = linkedCheckboxes(before.body);
  if ([...checks].some(([id, checked]) => previousChecks.get(id) !== checked)) {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM action_board WHERE id=1",
    );
    if (row) {
      const board: ActionBoard = JSON.parse(row.value);
      board.tasks = board.tasks.map((task) =>
        task.sourceNoteId === next.id &&
        checks.has(task.id) &&
        previousChecks.get(task.id) !== checks.get(task.id)
          ? { ...task, done: checks.get(task.id)! }
          : task,
      );
      await db.runAsync(
        "UPDATE action_board SET value=? WHERE id=1",
        JSON.stringify(board),
      );
    }
  }
  return next;
}
export async function updateLinkedTaskDocuments(
  db: SQLiteDatabase,
  tasks: ActionTask[],
) {
  for (const id of new Set(
    tasks
      .map((task) => task.sourceNoteId)
      .filter((id): id is string => Boolean(id)),
  )) {
    const row = await db.getFirstAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE id=? AND deleted_at IS NULL",
      id,
    );
    if (!row) continue;
    const before = document(row),
      now = nextTime(before.updatedAt);
    const body = updateCheckboxes(
      before.body,
      new Map(
        tasks
          .filter((task) => task.sourceNoteId === id)
          .map((task) => [task.id, task.done]),
      ),
      now,
    );
    if (body !== before.body)
      await write(db, before, { ...before, body, updatedAt: now }, "manual");
  }
}
function nextTime(previous?: string) {
  return new Date(
    Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0),
  ).toISOString();
}

export async function listEssayDocuments(): Promise<EssayDocument[]> {
  return (
    await (
      await getDatabase()
    ).getAllAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE deleted_at IS NULL ORDER BY updated_at DESC",
    )
  ).map(document);
}
export async function getEssayDocument(
  id: string,
  includeTrash = false,
): Promise<EssayDocument | null> {
  const row = await (
    await getDatabase()
  ).getFirstAsync<DocumentRow>(
    `SELECT * FROM essay_documents WHERE id=?${includeTrash ? "" : " AND deleted_at IS NULL"}`,
    id,
  );
  return row ? document(row) : null;
}
export async function addEssayDocument(
  input: NewEssayDocument,
  reason: EssayRevisionReason = "created",
  recordId?: string,
): Promise<EssayDocument> {
  return insertEssayDocument(input, reason, recordId);
}
export async function recoverRemovedEssayDraft(removedId: string, copyId: string, input: NewEssayDocument): Promise<EssayDocument> {
  if (copyId === removedId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(copyId))
    throw new Error("A recovered draft needs a new local identity.");
  return insertEssayDocument({ title: input.title, summary: input.summary, body: input.body, collectionName: input.collectionName, visibility: "private", sourceId: null, metadata: {} }, "created", copyId, removedId);
}
async function insertEssayDocument(
  input: NewEssayDocument,
  reason: EssayRevisionReason,
  recordId?: string,
  removedId?: string,
): Promise<EssayDocument> {
  await getDatabase();
  const now = nextTime();
  const next: EssayDocument = {
    id: recordId ?? Crypto.randomUUID(),
    sourceId: input.sourceId ?? null,
    title: input.title.trim() || "Untitled",
    summary: input.summary.trim(),
    body: input.body,
    collectionName: input.collectionName.trim() || "Unsorted",
    visibility: input.visibility,
    createdAt:
      reason === "import" &&
      input.importedCreatedAt &&
      Number.isFinite(Date.parse(input.importedCreatedAt))
        ? new Date(input.importedCreatedAt).toISOString()
        : now,
    updatedAt: now,
    metadata: normaliseMetadata({
      kind: ["jokes", "memes", "sayings"].includes(
        input.collectionName.trim().toLowerCase(),
      )
        ? (input.collectionName.trim().toLowerCase() as
            | "jokes"
            | "memes"
            | "sayings")
        : "writing",
      ...input.metadata,
    }),
    deletedAt: null,
  };
  return withVaultTransaction(async (db) => {
    if (removedId) {
      const removed = await db.getFirstAsync<DocumentRow>("SELECT * FROM essay_documents WHERE id=?", removedId);
      if (removed && !removed.deleted_at)
        throw new Error("This essay was restored. Reopen it to review before saving.");
      const existing = await db.getFirstAsync<DocumentRow>("SELECT * FROM essay_documents WHERE id=?", next.id);
      if (existing) {
        const copied = document(existing);
        if (copied.deletedAt || copied.sourceId !== null || copied.visibility !== "private" ||
          ["title", "summary", "body", "collectionName"].some(key => copied[key as keyof EssayDocument] !== next[key as keyof EssayDocument]))
          throw new Error("The recovered copy changed elsewhere. Your retained draft is still here; review that copy before retrying.");
        return copied;
      }
    }
    await db.runAsync(
      `INSERT INTO essay_documents (id, source_id, title, summary, body, collection_name, visibility, created_at, updated_at, metadata_json, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      next.id,
      next.sourceId,
      next.title,
      next.summary,
      next.body,
      next.collectionName,
      next.visibility,
      next.createdAt,
      now,
      JSON.stringify(next.metadata),
    );
    await appendRevision(db, null, next, reason);
    return next;
  });
}
export async function saveEssayDocument(
  id: string,
  input: NewEssayDocument,
  reason: EssayRevisionReason = "manual",
): Promise<EssayDocument> {
  await getDatabase();
  return withVaultTransaction(async (db) => {
    const row = await db.getFirstAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE id=?",
      id,
    );
    if (!row)
      throw new Error(
        "This document no longer exists. Your draft has been kept.",
      );
    if (row.deleted_at)
      throw new Error(
        "This document is in Trash. Restore it before editing. Your draft has been kept.",
      );
    const before = document(row);
    const next = {
      ...before,
      sourceId: input.sourceId === undefined ? before.sourceId : input.sourceId,
      title: input.title.trim() || "Untitled",
      summary: input.summary.trim(),
      body: input.body,
      collectionName: input.collectionName.trim() || "Unsorted",
      visibility: input.visibility,
      metadata: normaliseMetadata({
        kind:
          before.metadata?.kind ??
          (["jokes", "memes", "sayings"].includes(
            before.collectionName.trim().toLowerCase(),
          )
            ? (before.collectionName.trim().toLowerCase() as
                | "jokes"
                | "memes"
                | "sayings")
            : "writing"),
        ...(input.metadata ?? before.metadata),
      }),
    };
    if (JSON.stringify(before) === JSON.stringify(next)) return before;
    if (input.expectedUpdatedAt && input.expectedUpdatedAt !== before.updatedAt)
      throw new Error(
        "This document changed in another window or device. Your draft is preserved; reopen the document to compare before saving.",
      );
    return write(
      db,
      before,
      { ...next, updatedAt: nextTime(before.updatedAt) },
      reason,
    );
  });
}
export async function listEssayRevisions(id: string): Promise<EssayRevision[]> {
  return (
    await (
      await getDatabase()
    ).getAllAsync<RevisionRow>(
      "SELECT * FROM essay_revisions WHERE essay_id=? ORDER BY created_at DESC, id DESC",
      id,
    )
  ).map(revision);
}
export type EssayRevisionSummary = Omit<
  EssayRevision,
  "body" | "summary" | "metadata"
>;
export async function listEssayRevisionSummaries(
  id: string,
  limit = 100,
  offset = 0,
): Promise<EssayRevisionSummary[]> {
  const rows = await (
    await getDatabase()
  ).getAllAsync<RevisionRow>(
    `SELECT id, essay_id, sequence, title, '' AS summary, '' AS body, character_count, change_size, reason, created_at,
    collection_name, visibility, source_id, NULL AS metadata_json, deleted_at, device_id, parent_id, change_summary FROM essay_revisions
    WHERE essay_id=? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    id,
    Math.min(Math.max(limit, 1), 500),
    Math.max(offset, 0),
  );
  return rows.map((row) => {
    const { body, summary, metadata, ...rest } = revision(row);
    return rest;
  });
}
export async function getEssayRevision(
  id: string,
): Promise<EssayRevision | null> {
  const row = await (
    await getDatabase()
  ).getFirstAsync<RevisionRow>("SELECT * FROM essay_revisions WHERE id=?", id);
  return row ? revision(row) : null;
}
export async function restoreEssayRevision(id: string): Promise<EssayDocument> {
  const saved = await getEssayRevision(id);
  if (!saved) throw new Error("This version is unavailable.");
  const current = await getEssayDocument(saved.essayId);
  if (!current) throw new Error("Restore this document from Trash first.");
  return saveEssayDocument(
    current.id,
    {
      ...current,
      title: saved.title,
      summary: saved.summary,
      body: saved.body,
      collectionName: saved.collectionName ?? current.collectionName,
      visibility: saved.visibility ?? current.visibility,
      sourceId:
        saved.metadata === undefined ? current.sourceId : saved.sourceId,
      metadata: saved.metadata ?? current.metadata,
      expectedUpdatedAt: current.updatedAt,
    },
    "restored",
  );
}
export async function listTrashedDocuments(): Promise<EssayDocument[]> {
  return (
    await (
      await getDatabase()
    ).getAllAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
    )
  ).map(document);
}
async function setTrashed(
  id: string,
  trashed: boolean,
): Promise<EssayDocument> {
  await getDatabase();
  return withVaultTransaction(async (db) => {
    const row = await db.getFirstAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE id=?",
      id,
    );
    if (!row) throw new Error("This document no longer exists.");
    const before = document(row);
    if (Boolean(before.deletedAt) === trashed) return before;
    const now = nextTime(before.updatedAt);
    return write(
      db,
      before,
      { ...before, deletedAt: trashed ? now : null, updatedAt: now },
      trashed ? "trash" : "restored",
    );
  });
}
export async function removeEssayDocument(id: string): Promise<void> {
  await setTrashed(id, true);
}
export async function restoreTrashedDocument(id: string) {
  return setTrashed(id, false);
}
export async function permanentlyDeleteDocument(id: string) {
  await getDatabase();
  await withVaultTransaction(async (db) => {
    const row = await db.getFirstAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE id=?",
      id,
    );
    if (!row?.deleted_at)
      throw new Error("Only documents in Trash can be permanently deleted.");
    await db.runAsync(
      "DELETE FROM essay_documents WHERE id=? AND deleted_at IS NOT NULL",
      id,
    );
  });
}

export async function mergeEssayDocuments(targetId: string, sourceId: string) {
  if (targetId === sourceId) throw new Error("Choose a different destination.");
  await getDatabase();
  return withVaultTransaction(async (db) => {
    const targetRow = await db.getFirstAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE id=? AND deleted_at IS NULL",
      targetId,
    );
    const sourceRow = await db.getFirstAsync<DocumentRow>(
      "SELECT * FROM essay_documents WHERE id=? AND deleted_at IS NULL",
      sourceId,
    );
    if (!targetRow || !sourceRow)
      throw new Error("Both documents must be outside Trash.");
    const target = document(targetRow),
      source = document(sourceRow),
      now = nextTime(target.updatedAt);
    const blocks = (body: string) =>
      readDocument(body)?.blocks ?? [
        {
          type: "text" as const,
          text: body,
          font: "sans" as const,
          style: "paragraph" as const,
        },
      ];
    const body = writeDocument({
      version: 1,
      blocks: [
        ...blocks(target.body),
        { type: "text", text: source.title, font: "sans", style: "heading" },
        ...blocks(source.body),
      ],
    });
    await write(
      db,
      target,
      {
        ...target,
        body,
        updatedAt: now,
        metadata: {
          ...target.metadata,
          mergedFrom: [
            ...(target.metadata?.mergedFrom ?? []),
            ...(source.metadata?.mergedFrom ?? []),
            source.id,
          ],
        },
      },
      "merge",
    );
    await write(
      db,
      source,
      {
        ...source,
        deletedAt: now,
        updatedAt: nextTime(source.updatedAt),
        metadata: { ...source.metadata, mergedIntoId: target.id },
      },
      "merge",
    );
    return target.id;
  });
}
