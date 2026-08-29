import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { excludeFromDeviceBackup } from './backup-exclusion';
import { getOrCreateVaultKey } from './keys';
import { runLearningMigrations } from './learning-migrations';

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function createDatabase(): Promise<SQLiteDatabase> {
  const key = await getOrCreateVaultKey();
  const database = await openDatabaseAsync('private-companion.db');
  await database.execAsync(`PRAGMA key = '${key}';`);
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const excluded = await excludeFromDeviceBackup(String(defaultDatabaseDirectory));
  if (!excluded) throw new Error('The vault database could not be excluded from device backup.');
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('note', 'finance', 'photo')),
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      amount REAL,
      attachment_uri TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_drafts (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('essay', 'adventure', 'project', 'challenge', 'product', 'quote', 'now')),
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      source_id TEXT,
      operation TEXT NOT NULL DEFAULT 'create' CHECK(operation IN ('create', 'update')),
      now_location_label TEXT,
      now_location_lat REAL,
      now_location_lng REAL,
      now_location_zoom INTEGER,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'published')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publication_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('essay', 'adventure', 'project', 'challenge', 'product', 'quote', 'now', 'book')),
      local_id TEXT NOT NULL,
      manifest_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'submitted', 'failed')),
      error TEXT NOT NULL DEFAULT '',
      commit_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(item_type, local_id)
    );
    CREATE INDEX IF NOT EXISTS publication_jobs_status_index ON publication_jobs(status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS life_items (
      id TEXT PRIMARY KEY NOT NULL,
      area TEXT NOT NULL CHECK(area IN ('goal', 'fucket', 'learning', 'interest', 'trip')),
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
      target_date TEXT NOT NULL DEFAULT '',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS life_items_area_index ON life_items(area, completed_at, updated_at DESC);

    CREATE TABLE IF NOT EXISTS relationship_contacts (
      id TEXT PRIMARY KEY NOT NULL,
      device_contact_id TEXT,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      birthday TEXT NOT NULL DEFAULT '',
      image_uri TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1)),
      first_met_at TEXT,
      first_met_place TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      cadence_days INTEGER NOT NULL DEFAULT 30 CHECK(cadence_days BETWEEN 1 AND 3650),
      last_contacted_at TEXT,
      next_follow_up_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS relationship_contacts_follow_up_index
      ON relationship_contacts(next_follow_up_at, updated_at DESC);

    CREATE TABLE IF NOT EXISTS relationship_interactions (
      id TEXT PRIMARY KEY NOT NULL,
      contact_id TEXT NOT NULL REFERENCES relationship_contacts(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS relationship_interactions_contact_index
      ON relationship_interactions(contact_id, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS essay_documents (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      collection_name TEXT NOT NULL DEFAULT 'Unsorted',
      visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS essay_documents_source_unique
      ON essay_documents(source_id) WHERE source_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS essay_documents_collection_index
      ON essay_documents(collection_name, updated_at DESC);

    CREATE TABLE IF NOT EXISTS essay_revisions (
      id TEXT PRIMARY KEY NOT NULL,
      essay_id TEXT NOT NULL REFERENCES essay_documents(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      character_count INTEGER NOT NULL DEFAULT 0,
      change_size INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL CHECK(reason IN ('created', 'autosave', 'manual', 'studio')),
      created_at TEXT NOT NULL,
      UNIQUE(essay_id, sequence)
    );
    CREATE INDEX IF NOT EXISTS essay_revisions_timeline_index
      ON essay_revisions(essay_id, sequence DESC);

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      public_id TEXT,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      isbn TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
      re_reads INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      review TEXT NOT NULL DEFAULT '',
      cover_uri TEXT,
      format TEXT NOT NULL CHECK(format IN ('epub', 'pdf', 'metadata')),
      encrypted_file_uri TEXT,
      original_file_name TEXT,
      file_hash TEXT UNIQUE,
      reading_status TEXT NOT NULL DEFAULT 'unread' CHECK(reading_status IN ('unread', 'reading', 'finished')),
      progress REAL NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 1),
      locator TEXT,
      total_pages INTEGER,
      current_page INTEGER,
      is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0, 1)),
      added_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_opened_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS books_public_id_unique
      ON books(public_id) WHERE public_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS books_recent_index ON books(last_opened_at DESC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS books_title_author_index ON books(title, author);
    CREATE INDEX IF NOT EXISTS books_isbn_index ON books(isbn);

    CREATE TABLE IF NOT EXISTS book_annotations (
      id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('highlight', 'note', 'bookmark')),
      locator TEXT NOT NULL,
      selected_text TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#FFD54F',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS book_annotations_book_index ON book_annotations(book_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS book_collections (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS book_collection_members (
      collection_id TEXT NOT NULL REFERENCES book_collections(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      PRIMARY KEY(collection_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds >= 0),
      local_day TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reading_sessions_book_index
      ON reading_sessions(book_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS reading_sessions_day_index
      ON reading_sessions(local_day, started_at DESC);
  `);

  const draftColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(public_drafts)');
  if (!draftColumns.some((column) => column.name === 'source_id')) {
    await database.execAsync(`
      BEGIN;
      ALTER TABLE public_drafts RENAME TO public_drafts_legacy;
      CREATE TABLE public_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('essay', 'adventure', 'project', 'challenge', 'product', 'quote', 'now')),
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        source_id TEXT,
        operation TEXT NOT NULL DEFAULT 'create' CHECK(operation IN ('create', 'update')),
        now_location_label TEXT,
        now_location_lat REAL,
        now_location_lng REAL,
        now_location_zoom INTEGER,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'published')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO public_drafts (id, type, title, summary, body, source_id, operation, status, created_at, updated_at)
      SELECT id, type, title, summary, body, NULL, 'create', status, created_at, updated_at
      FROM public_drafts_legacy;
      DROP TABLE public_drafts_legacy;
      COMMIT;
    `);
  }
  const currentDraftColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(public_drafts)');
  const draftColumnNames = new Set(currentDraftColumns.map((column) => column.name));
  if (!draftColumnNames.has('now_location_label')) await database.execAsync('ALTER TABLE public_drafts ADD COLUMN now_location_label TEXT;');
  if (!draftColumnNames.has('now_location_lat')) await database.execAsync('ALTER TABLE public_drafts ADD COLUMN now_location_lat REAL;');
  if (!draftColumnNames.has('now_location_lng')) await database.execAsync('ALTER TABLE public_drafts ADD COLUMN now_location_lng REAL;');
  if (!draftColumnNames.has('now_location_zoom')) await database.execAsync('ALTER TABLE public_drafts ADD COLUMN now_location_zoom INTEGER;');
  const relationshipColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(relationship_contacts)');
  const relationshipColumnNames = new Set(relationshipColumns.map((column) => column.name));
  if (!relationshipColumnNames.has('email')) await database.execAsync("ALTER TABLE relationship_contacts ADD COLUMN email TEXT NOT NULL DEFAULT '';");
  if (!relationshipColumnNames.has('phone')) await database.execAsync("ALTER TABLE relationship_contacts ADD COLUMN phone TEXT NOT NULL DEFAULT '';");
  if (!relationshipColumnNames.has('website')) await database.execAsync("ALTER TABLE relationship_contacts ADD COLUMN website TEXT NOT NULL DEFAULT '';");
  if (!relationshipColumnNames.has('device_contact_id')) await database.execAsync('ALTER TABLE relationship_contacts ADD COLUMN device_contact_id TEXT;');
  if (!relationshipColumnNames.has('latitude')) await database.execAsync('ALTER TABLE relationship_contacts ADD COLUMN latitude REAL;');
  if (!relationshipColumnNames.has('longitude')) await database.execAsync('ALTER TABLE relationship_contacts ADD COLUMN longitude REAL;');
  if (!relationshipColumnNames.has('birthday')) await database.execAsync("ALTER TABLE relationship_contacts ADD COLUMN birthday TEXT NOT NULL DEFAULT '';");
  if (!relationshipColumnNames.has('image_uri')) await database.execAsync("ALTER TABLE relationship_contacts ADD COLUMN image_uri TEXT NOT NULL DEFAULT '';");
  if (!relationshipColumnNames.has('favorite')) await database.execAsync('ALTER TABLE relationship_contacts ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;');
  if (!relationshipColumnNames.has('first_met_at')) await database.execAsync('ALTER TABLE relationship_contacts ADD COLUMN first_met_at TEXT;');
  if (!relationshipColumnNames.has('first_met_place')) await database.execAsync("ALTER TABLE relationship_contacts ADD COLUMN first_met_place TEXT NOT NULL DEFAULT '';");
  await database.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS relationship_contacts_device_unique ON relationship_contacts(device_contact_id) WHERE device_contact_id IS NOT NULL;');
  await runLearningMigrations(database);
  return database;
}

export function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= createDatabase();
  return databasePromise;
}
