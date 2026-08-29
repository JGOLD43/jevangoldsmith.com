import type { SQLiteDatabase } from 'expo-sqlite';

export async function runLearningMigrations(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS learning_skill_states (
      skill_id TEXT PRIMARY KEY NOT NULL, status TEXT NOT NULL DEFAULT 'ready', strength INTEGER NOT NULL DEFAULT 0,
      clean_retrievals INTEGER NOT NULL DEFAULT 0, helped_retrievals INTEGER NOT NULL DEFAULT 0,
      misses INTEGER NOT NULL DEFAULT 0, next_review_at TEXT, last_attempt_at TEXT
    );
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY NOT NULL, language TEXT NOT NULL DEFAULT 'fr', duration_minutes INTEGER NOT NULL,
      focus TEXT NOT NULL, plan_json TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, elapsed_seconds INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS learning_attempts (
      id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL, exercise_kind TEXT NOT NULL, result TEXT NOT NULL,
      response_seconds INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS learning_attempts_skill_index ON learning_attempts(skill_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS learning_attempts_day_index ON learning_attempts(created_at DESC);
    CREATE TABLE IF NOT EXISTS learning_milestone_evidence (
      milestone_id TEXT PRIMARY KEY NOT NULL, completed_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS learning_cards (
      id TEXT PRIMARY KEY NOT NULL, skill_id TEXT, deck_name TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]', reverse_enabled INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'curriculum', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS learning_cards_deck_index ON learning_cards(deck_name, archived, updated_at DESC);
    CREATE TABLE IF NOT EXISTS learning_card_states (
      card_id TEXT NOT NULL REFERENCES learning_cards(id) ON DELETE CASCADE, direction TEXT NOT NULL,
      stability REAL NOT NULL DEFAULT 0, difficulty REAL NOT NULL DEFAULT 5, due_at TEXT NOT NULL,
      interval_days REAL NOT NULL DEFAULT 0, review_count INTEGER NOT NULL DEFAULT 0,
      lapse_count INTEGER NOT NULL DEFAULT 0, last_reviewed_at TEXT, PRIMARY KEY(card_id, direction)
    );
    CREATE INDEX IF NOT EXISTS learning_card_states_due_index ON learning_card_states(due_at, review_count);
    CREATE TABLE IF NOT EXISTS learning_card_reviews (
      id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL REFERENCES learning_cards(id) ON DELETE CASCADE,
      direction TEXT NOT NULL, remembered INTEGER NOT NULL, response_ms INTEGER NOT NULL DEFAULT 0,
      previous_interval_days REAL NOT NULL, next_interval_days REAL NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS learning_card_reviews_card_index ON learning_card_reviews(card_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS skill_trees (
      id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS skill_trees_updated_index ON skill_trees(updated_at DESC);
    CREATE TABLE IF NOT EXISTS skill_tree_nodes (
      id TEXT PRIMARY KEY NOT NULL, tree_id TEXT NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', practice_prompt TEXT NOT NULL DEFAULT '',
      success_criteria TEXT NOT NULL DEFAULT '', prerequisites_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS skill_tree_nodes_tree_index ON skill_tree_nodes(tree_id, created_at);
    CREATE TABLE IF NOT EXISTS skill_tree_progress (
      node_id TEXT PRIMARY KEY NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
      strength INTEGER NOT NULL DEFAULT 0, clean_attempts INTEGER NOT NULL DEFAULT 0,
      helped_attempts INTEGER NOT NULL DEFAULT 0, misses INTEGER NOT NULL DEFAULT 0, last_practiced_at TEXT
    );
  `);
  await database.runAsync('INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)', 'learning-v1', new Date().toISOString());
  await database.runAsync('INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)', 'skill-trees-v1', new Date().toISOString());
  const applied = await database.getFirstAsync<{ id: string }>('SELECT id FROM schema_migrations WHERE id = ?', 'skill-trees-v2');
  if (applied) return;
  const nodeColumns = new Set((await database.getAllAsync<{ name: string }>('PRAGMA table_info(skill_tree_nodes)')).map((column) => column.name));
  if (!nodeColumns.has('dimension')) await database.execAsync("ALTER TABLE skill_tree_nodes ADD COLUMN dimension TEXT NOT NULL DEFAULT 'procedural';");
  if (!nodeColumns.has('source_references_json')) await database.execAsync("ALTER TABLE skill_tree_nodes ADD COLUMN source_references_json TEXT NOT NULL DEFAULT '[]';");
  if (!nodeColumns.has('inference_confidence')) await database.execAsync('ALTER TABLE skill_tree_nodes ADD COLUMN inference_confidence REAL NOT NULL DEFAULT 1;');
  const progressColumns = new Set((await database.getAllAsync<{ name: string }>('PRAGMA table_info(skill_tree_progress)')).map((column) => column.name));
  if (!progressColumns.has('stability_days')) await database.execAsync('ALTER TABLE skill_tree_progress ADD COLUMN stability_days REAL NOT NULL DEFAULT 0;');
  if (!progressColumns.has('difficulty')) await database.execAsync('ALTER TABLE skill_tree_progress ADD COLUMN difficulty REAL NOT NULL DEFAULT 5;');
  if (!progressColumns.has('due_at')) await database.execAsync('ALTER TABLE skill_tree_progress ADD COLUMN due_at TEXT;');
  if (!progressColumns.has('retention_estimate')) await database.execAsync('ALTER TABLE skill_tree_progress ADD COLUMN retention_estimate REAL NOT NULL DEFAULT 0;');
  if (!progressColumns.has('dimension_scores_json')) await database.execAsync("ALTER TABLE skill_tree_progress ADD COLUMN dimension_scores_json TEXT NOT NULL DEFAULT '{\"conceptual\":0,\"procedural\":0,\"conditional\":0,\"discrimination\":0,\"transfer\":0}';");
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS skill_tree_attempts (
      id TEXT PRIMARY KEY NOT NULL,
      tree_id TEXT NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
      node_id TEXT NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
      result TEXT NOT NULL CHECK(result IN ('clean', 'helped', 'missed')),
      dimension TEXT NOT NULL,
      response_ms INTEGER NOT NULL DEFAULT 0,
      hint_count INTEGER NOT NULL DEFAULT 0,
      transfer_context INTEGER NOT NULL DEFAULT 0 CHECK(transfer_context IN (0, 1)),
      strength_before INTEGER NOT NULL,
      strength_after INTEGER NOT NULL,
      retention_before REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS skill_tree_attempts_node_index ON skill_tree_attempts(node_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS skill_tree_attempts_tree_index ON skill_tree_attempts(tree_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS skill_tree_edges (
      tree_id TEXT NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
      from_node_id TEXT NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
      to_node_id TEXT NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
      relationship TEXT NOT NULL CHECK(relationship IN ('prerequisite', 'encompasses', 'confusable')),
      weight REAL NOT NULL DEFAULT 1,
      confidence REAL NOT NULL DEFAULT 1,
      rationale TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(from_node_id, to_node_id, relationship)
    );
  `);
  await database.runAsync('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', 'skill-trees-v2', new Date().toISOString());
}
