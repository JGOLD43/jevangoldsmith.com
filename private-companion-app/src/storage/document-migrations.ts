import type { SQLiteDatabase } from "expo-sqlite";

export async function runDocumentMigrations(db: SQLiteDatabase) {
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS knowledge_preferences (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);",
  );
  const columns = new Set(
    (
      await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(essay_documents)",
      )
    ).map((c) => c.name),
  );
  const revisions = new Set(
    (
      await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(essay_revisions)",
      )
    ).map((c) => c.name),
  );
  if (columns.has("metadata_json") && revisions.has("parent_id")) return;
  await db.execAsync("BEGIN IMMEDIATE");
  try {
    if (!columns.has("metadata_json"))
      await db.execAsync(
        "ALTER TABLE essay_documents ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';",
      );
    if (!columns.has("deleted_at"))
      await db.execAsync(
        "ALTER TABLE essay_documents ADD COLUMN deleted_at TEXT;",
      );
    if (!revisions.has("parent_id")) {
      // Sequence is a display hint, never identity: two offline devices may
      // legitimately create the same sequence. Immutable UUIDs merge safely.
      await db.execAsync(`
        CREATE TABLE essay_revisions_next (
          id TEXT PRIMARY KEY NOT NULL, essay_id TEXT NOT NULL REFERENCES essay_documents(id) ON DELETE CASCADE,
          sequence INTEGER NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
          character_count INTEGER NOT NULL DEFAULT 0, change_size INTEGER NOT NULL DEFAULT 0,
          reason TEXT NOT NULL, created_at TEXT NOT NULL,
          collection_name TEXT, visibility TEXT, source_id TEXT, metadata_json TEXT, deleted_at TEXT,
          device_id TEXT NOT NULL DEFAULT '', parent_id TEXT, change_summary TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO essay_revisions_next (id, essay_id, sequence, title, summary, body, character_count, change_size, reason, created_at)
          SELECT id, essay_id, sequence, title, summary, body, character_count, change_size, reason, created_at FROM essay_revisions;
        DROP TABLE essay_revisions;
        ALTER TABLE essay_revisions_next RENAME TO essay_revisions;
        CREATE INDEX essay_revisions_timeline_index ON essay_revisions(essay_id, created_at DESC, id DESC);
      `);
    }
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS essay_documents_live_index ON essay_documents(deleted_at, updated_at DESC); CREATE TABLE IF NOT EXISTS local_preferences (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
    );
    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}
