import { isFoodCaptureRow, reviewedFoodPreferenceId } from "./food-capture-sync.ts";
import { canonical, mergeSnapshots, rowKey, same, SYNC_TABLES, validateSnapshot, type SyncRow, type SyncSnapshot, type SyncResolutions, type SyncValue } from './device-sync.ts';

// First pairing has no shared ancestor. Keep independent records from both
// devices and reconcile only identities enforced by the database (plus exact
// copies of built-in curricula). Real differences still require a choice.
export function mergeInitialSnapshots(local: SyncSnapshot, remote: SyncSnapshot, resolutions: SyncResolutions = {}) {
  validateSnapshot(local, remote.vaultId, remote);
  validateSnapshot(remote, remote.vaultId, local);
  const here: SyncSnapshot = JSON.parse(JSON.stringify(local));
  const there: SyncSnapshot = JSON.parse(JSON.stringify(remote));
  const aliases: Record<string, Map<string, string>> = {};
  const rows = (snapshot: SyncSnapshot, table: string) => snapshot.tables[table].rows;
  function reconcile(table: string, identities: (row: SyncRow, snapshot: SyncSnapshot) => string[]) {
    const index = new Map<string, string>();
    for (const row of rows(there, table)) for (const identity of identities(row, there)) index.set(identity, String(row.id));
    const map = aliases[table] = new Map();
    for (const row of rows(here, table)) {
      const matches = [...new Set(identities(row, here).map(key => index.get(key)).filter(Boolean))];
      if (matches.length > 1) throw new Error('Two records match the same library item. Keep both devices unchanged and review the duplicate before connecting.');
      if (matches[0] && matches[0] !== row.id) { map.set(String(row.id), matches[0]); row.id = matches[0]; }
    }
  }
  const identity = (field: string, value: SyncValue) => typeof value === 'string' && value ? [`${field}:${value}`] : [];
  reconcile('books', row => [...identity('public', row.public_id), ...identity('file', row.file_hash)]);
  reconcile('book_collections', row => identity('name', String(row.name).toLowerCase()));
  reconcile('essay_documents', row => identity('source', row.source_id));
  reconcile('learning_cards', row => identity('source', row.source_key));
  function treeIdentity(row: SyncRow, snapshot: SyncSnapshot) {
    const nodes = rows(snapshot, 'skill_tree_nodes').filter(node => node.tree_id === row.id);
    const titleById = new Map(nodes.map(node => [node.id, node.title]));
    return canonical([row.title, row.description, nodes.map(node => [node.title, node.description, node.practice_prompt,
      node.success_criteria, node.dimension, JSON.parse(String(node.prerequisites_json)).map((id: string) => titleById.get(id)).sort()]).sort((a, b) => canonical(a).localeCompare(canonical(b)))]);
  }
  reconcile('skill_trees', (row, snapshot) => [treeIdentity(row, snapshot)]);
  function remap(table: string, column: string, target: string) {
    for (const row of rows(here, table)) row[column] = aliases[target]?.get(String(row[column])) ?? row[column];
  }
  remap('skill_tree_nodes', 'tree_id', 'skill_trees');
  reconcile('skill_tree_nodes', row => [canonical([row.tree_id, row.title, row.description, row.practice_prompt, row.success_criteria])]);
  for (const table of ['book_annotations', 'book_collection_members', 'reading_sessions', 'learning_cards']) remap(table, 'book_id', 'books');
  remap('book_collection_members', 'collection_id', 'book_collections');
  remap('essay_revisions', 'essay_id', 'essay_documents');
  for (const table of ['learning_card_states', 'learning_card_reviews']) remap(table, 'card_id', 'learning_cards');
  for (const table of ['skill_tree_attempts', 'skill_tree_edges', 'skill_practice_time']) remap(table, 'tree_id', 'skill_trees');
  for (const table of ['skill_tree_progress', 'skill_tree_attempts', 'skill_practice_time']) remap(table, 'node_id', 'skill_tree_nodes');
  for (const field of ['from_node_id', 'to_node_id']) if (here.tables.skill_tree_edges.columns.includes(field)) remap('skill_tree_edges', field, 'skill_tree_nodes');
  for (const row of rows(here, 'skill_tree_nodes')) {
    row.prerequisites_json = JSON.stringify(JSON.parse(String(row.prerequisites_json)).map((id: string) => aliases.skill_tree_nodes.get(id) ?? id));
    if (row.source_references_json) row.source_references_json = JSON.stringify(JSON.parse(String(row.source_references_json)).map((reference: Record<string, unknown>) => ({ ...reference, bookId: aliases.books.get(String(reference.bookId)) ?? reference.bookId })));
  }
  const reviewedFoods = new Set([...here.tables.knowledge_preferences.rows, ...there.tables.knowledge_preferences.rows]
    .filter(isFoodCaptureRow).map(reviewedFoodPreferenceId).filter((key): key is string => key !== null));
  const base: SyncSnapshot = { version: 1, vaultId: local.vaultId, files: {}, tables: {} };
  const blank = (value: SyncValue) => value === null || value === '' || value === 0 || value === '[]' || value === '{}';
  const neverPracticed = (name: string, row: SyncRow) => name === 'learning_card_states'
    ? row.review_count === 0 && !row.last_reviewed_at
    : name === 'learning_skill_states' ? !row.last_attempt_at && !row.clean_retrievals && !row.helped_retrievals && !row.misses
    : name === 'skill_tree_progress' ? !row.last_practiced_at && !row.clean_attempts && !row.helped_attempts && !row.misses : false;
  for (const name of SYNC_TABLES) {
    const table = here.tables[name], other = new Map(rows(there, name).map(row => [rowKey(table, row), row]));
    const ancestors: SyncRow[] = [];
    // Multiple identity aliases can collapse duplicate collection memberships.
    const unique = new Map<string, SyncRow>();
    for (const row of table.rows) {
      const key = rowKey(table, row), previous = unique.get(key);
      if (previous && !same(previous, row)) throw new Error('This device has two different copies of the same library item. Your data is unchanged; review the duplicates before connecting.');
      unique.set(key, row);
    }
    table.rows = [...unique.values()];
    for (const row of table.rows) {
      // First pairing has no real capture ancestor. Keep both actual packets and
      // their reviewed foods; never invent a null JSON packet as an ancestor.
      if (name === 'knowledge_preferences' && (isFoodCaptureRow(row) || reviewedFoods.has(String(row.id)))) continue;
      const incoming = other.get(rowKey(table, row));
      if (!incoming) continue;
      for (const field of ['created_at', 'added_at']) if (typeof row[field] === 'string' && typeof incoming[field] === 'string') {
        row[field] = incoming[field] = row[field] < incoming[field] ? row[field] : incoming[field];
      }
      if (neverPracticed(name, row) || neverPracticed(name, incoming)) { ancestors.push({ ...(neverPracticed(name, row) ? row : incoming) }); continue; }
      const before: SyncRow = {};
      for (const field of table.columns) {
        before[field] = same(row[field], incoming[field]) ? row[field]
          : ['visibility', 'is_public', 'deleted_at'].includes(field) ? '__initial_conflict__'
          : blank(row[field]) ? row[field] : blank(incoming[field]) ? incoming[field] : null;
      }
      if (name === 'books') {
        const untouched = (value: SyncRow) => !value.last_opened_at && !value.locator && !value.progress;
        const emptyPosition = untouched(row) ? row : untouched(incoming) ? incoming : null;
        if (emptyPosition) for (const field of ['locator', 'progress', 'current_page', 'total_pages', 'reading_status', 'last_opened_at']) before[field] = emptyPosition[field];
        if (row.format === 'metadata' || incoming.format === 'metadata') before.format = 'metadata';
      }
      ancestors.push(before);
    }
    base.tables[name] = { ...table, rows: ancestors };
  }
  return mergeSnapshots(base, here, there, resolutions);
}
