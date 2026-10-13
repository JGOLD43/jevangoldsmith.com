import { assertFoodCaptureSnapshot, assertReviewedFoodRow, isFoodCaptureRow, mergeFoodCaptureRows, reviewedFoodPreferenceId } from "./food-capture-sync.ts";

export type SyncValue = string | number | null;
export type SyncRow = Record<string, SyncValue>;
export type SyncTable = { columns: string[]; primaryKey: string[]; rows: SyncRow[] };
export type SyncFile = { hash: string; size: number; chunks: string[] };
export type SyncSnapshot = { version: 1; vaultId: string; tables: Record<string, SyncTable>; files: Record<string, SyncFile> };
export type SyncConflict = { id: string; table: string; label: string; field: string; local: SyncRow | SyncValue | undefined; remote: SyncRow | SyncValue | undefined };
export type SyncResolution = { local: SyncConflict['local']; remote: SyncConflict['remote']; choice: 'local' | 'remote' };
export type SyncResolutions = Record<string, SyncResolution>;

// Device keys, credentials, publication delivery jobs, download sessions and
// native calendar/address-book identifiers never travel in sync snapshots.
export const SYNC_TABLES = [
  'vault_items', 'public_drafts', 'ai_messages', 'life_items',
  'relationship_contacts', 'relationship_interactions', 'essay_documents', 'essay_revisions',
  'books', 'book_annotations', 'book_collections', 'book_collection_members', 'reading_sessions',
  'learning_skill_states', 'learning_sessions', 'learning_attempts', 'learning_milestone_evidence',
  'learning_cards', 'learning_card_states', 'learning_card_reviews',
  'skill_trees', 'skill_tree_nodes', 'skill_tree_progress', 'skill_tree_attempts', 'skill_tree_edges', 'skill_practice_time',
  'action_board', 'year_plans', 'life_calendar_settings', 'knowledge_preferences',
] as const;

export function canonical(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }
export function rowKey(table: Pick<SyncTable, 'primaryKey'>, row: SyncRow): string { return canonical(table.primaryKey.map(key => row[key])); }

// Upgrade only explicitly known additive fields. Older apps reject the newer
// schema instead of dropping history/properties they cannot understand.
export function upgradeDocumentSnapshot(snapshot: SyncSnapshot, schema?: SyncSnapshot): SyncSnapshot {
  const defaults: Record<string, Record<string, SyncValue>> = {
    essay_documents: { metadata_json: '{}', deleted_at: null },
    essay_revisions: { collection_name: null, visibility: null, source_id: null, metadata_json: null, deleted_at: null, device_id: '', parent_id: null, change_summary: '' },
  };
  const result = { ...snapshot, tables: { ...snapshot.tables } };
  if (!result.tables.knowledge_preferences) result.tables.knowledge_preferences = { columns: ['id', 'value', 'updated_at'], primaryKey: ['id'], rows: [] };
  if (!schema) return result;
  for (const [name, fields] of Object.entries(defaults)) {
    const table = snapshot.tables[name], target = schema.tables[name];
    if (!table || !target || same(table.columns, target.columns)) continue;
    if (table.columns.some(c => !target.columns.includes(c)) || target.columns.some(c => !table.columns.includes(c) && !(c in fields))) continue;
    result.tables[name] = { ...table, columns: target.columns, rows: table.rows.map(row => Object.fromEntries(target.columns.map(c => [c, c in row ? row[c] : fields[c]]))) };
  }
  return result;
}

export function validateSnapshot(value: unknown, vaultId: string, schema?: SyncSnapshot): asserts value is SyncSnapshot {
  const snapshot = value as SyncSnapshot;
  if (!snapshot || snapshot.version !== 1 || snapshot.vaultId !== vaultId || !snapshot.tables || !snapshot.files) throw new Error('This is not a matching JGOLD sync snapshot.');
  if (Object.keys(snapshot.tables).sort().join(',') !== [...SYNC_TABLES].sort().join(',')) throw new Error('Update both JGOLD apps before syncing this data.');
  let count = 0;
  for (const name of SYNC_TABLES) {
    const table = snapshot.tables[name];
    if (!table || !Array.isArray(table.columns) || !table.columns.length || table.columns.some(c => !/^[a-z][a-z0-9_]*$/.test(c)) || new Set(table.columns).size !== table.columns.length || !Array.isArray(table.primaryKey) || !table.primaryKey.length || table.primaryKey.some(key => !table.columns.includes(key)) || !Array.isArray(table.rows)) throw new Error('Invalid sync table.');
    if (schema && (!same(table.columns, schema.tables[name].columns) || !same(table.primaryKey, schema.tables[name].primaryKey))) throw new Error('The apps use different data versions. Update both before syncing.');
    const keys = new Set<string>();
    for (const row of table.rows) {
      if (++count > 500_000 || !row || !same(Object.keys(row).sort(), [...table.columns].sort()) || Object.values(row).some(value => value !== null && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value)))) throw new Error('Invalid sync record.');
      if (table.primaryKey.some(key => row[key] === null)) throw new Error('Invalid sync record identity.');
      const key = rowKey(table, row);
      if (keys.has(key)) throw new Error('Duplicate sync record.');
      keys.add(key);
    }
  }
  assertFoodCaptureSnapshot(snapshot);
  for (const [hash, file] of Object.entries(snapshot.files)) {
    if (!/^[a-f0-9]{64}$/.test(hash) || !file || file.hash !== hash || !Number.isInteger(file.size) || file.size < 0 || file.size > 200 * 1024 * 1024 || !Array.isArray(file.chunks) || file.chunks.length > 64 || file.chunks.some(chunk => !/^[a-f0-9]{40}$/.test(chunk))) throw new Error('Invalid synced file.');
  }
}

export function mergeSnapshots(base: SyncSnapshot, local: SyncSnapshot, remote: SyncSnapshot, resolutions: SyncResolutions = {}): { snapshot: SyncSnapshot; conflicts: SyncConflict[] } {
  validateSnapshot(local, base.vaultId, base);
  validateSnapshot(remote, base.vaultId, base);
  const result: SyncSnapshot = { version: 1, vaultId: base.vaultId, tables: {}, files: { ...remote.files, ...local.files } };
  const conflicts: SyncConflict[] = [];
  function choose(table: string, key: string, label: string, field: string, before: SyncConflict['local'], here: SyncConflict['local'], there: SyncConflict['remote']): SyncConflict['local'] {
    if (same(here, there) || same(there, before)) return here;
    if (same(here, before)) return there;
    if (field === 'updated_at' && typeof here === 'string' && typeof there === 'string') return here > there ? here : there;
    const id = `${table}:${key}:${field}`;
    const resolution = resolutions[id];
    if (resolution && same(resolution.local, here) && same(resolution.remote, there)) return resolution.choice === 'local' ? here : there;
    conflicts.push({ id, table, label, field, local: here, remote: there });
    return here;
  }
  for (const name of SYNC_TABLES) {
    const table = local.tables[name];
    const maps = [base, local, remote].map(snapshot => new Map(snapshot.tables[name].rows.map(row => [rowKey(table, row), row])));
    const [before, here, there] = maps;
    const rows: SyncRow[] = [];
    const keys = [...new Set(maps.flatMap(map => [...map.keys()]))].sort();
    const captures = new Map<string, SyncRow>();
    const reviewedFoods = new Set<string>();
    if (name === 'knowledge_preferences') for (const key of keys) {
      const copies = [before.get(key), here.get(key), there.get(key)];
      if (!copies.some(isFoodCaptureRow)) continue;
      const selected = mergeFoodCaptureRows(...copies);
      captures.set(key, selected);
      const foodKey = reviewedFoodPreferenceId(selected);
      if (foodKey) reviewedFoods.add(foodKey);
    }
    for (const key of keys) {
      const b = before.get(key), l = here.get(key), r = there.get(key);
      const capture = captures.get(key);
      if (capture) { rows.push(capture); continue; }
      const preferenceId = String(l?.id ?? r?.id ?? b?.id);
      if (name === 'knowledge_preferences' && reviewedFoods.has(preferenceId)) {
        for (const food of [b, l, r]) if (food) assertReviewedFoodRow(food, preferenceId);
        // An actual saved food must survive a racing pending/discarded packet.
        // Merge its value and stamp together; conflicting edits still get a choice.
        const selected = !l || !r ? l ?? r ?? b : choose(name, key, 'Reviewed food', 'record', b, l, r) as SyncRow;
        if (selected) rows.push(selected);
        continue;
      }
      const label = String(l?.title || r?.title || l?.name || r?.name || l?.front || r?.front || name.replaceAll('_', ' ')).slice(0, 100);
      if (!l || !r) {
        const selected = choose(name, key, label, 'record', b, l, r) as SyncRow | undefined;
        if (selected) rows.push(selected);
      } else {
        if (['learning_card_states', 'learning_skill_states', 'skill_tree_progress', 'learning_sessions'].includes(name)) {
          rows.push(choose(name, key, label, 'progress', b, l, r) as SyncRow);
          continue;
        }
        const merged: SyncRow = {};
        const positionFields = name === 'books' ? ['locator', 'progress', 'current_page', 'total_pages', 'reading_status', 'last_opened_at'].filter(field => table.columns.includes(field)) : [];
        for (const column of table.columns) if (!positionFields.includes(column)) merged[column] = choose(name, key, label, column, b?.[column], l[column], r[column]) as SyncValue;
        if (positionFields.length) {
          const position = (row: SyncRow | undefined) => row ? Object.fromEntries(positionFields.map(field => [field, row[field]])) : undefined;
          Object.assign(merged, choose(name, key, label, 'reading position', position(b), position(l), position(r)));
        }
        rows.push(merged);
      }
    }
    result.tables[name] = { columns: table.columns, primaryKey: table.primaryKey, rows };
  }
  assertFoodCaptureSnapshot(result);
  return { snapshot: result, conflicts };
}
