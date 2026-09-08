import * as Crypto from 'expo-crypto';
import { summarisePractice } from '@/learning/practice-time';
import { getDatabase } from './database';

export async function savePracticeTime(input: { treeId: string; nodeId: string; kind: 'practice' | 'study'; durationMs: number; note: string }) {
  if (!Number.isFinite(input.durationMs) || input.durationMs <= 0 || input.durationMs > 43_200_000) throw new Error('Record between 0 and 720 minutes.');
  if (!input.note.trim()) throw new Error('Add what you produced or studied.');
  const database = await getDatabase();
  const node = await database.getFirstAsync('SELECT id FROM skill_tree_nodes WHERE id = ? AND tree_id = ?', input.nodeId, input.treeId);
  if (!node) throw new Error('This ability no longer exists.');
  await database.runAsync('INSERT INTO skill_practice_time (id, tree_id, node_id, kind, duration_ms, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', Crypto.randomUUID(), input.treeId, input.nodeId, input.kind, Math.round(input.durationMs), input.note.trim(), new Date().toISOString());
}
export async function getPracticeTime(treeId?: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ kind: 'practice' | 'study'; duration_ms: number; created_at: string; note: string; title: string }>(`SELECT p.kind, p.duration_ms, p.created_at, p.note, n.title FROM skill_practice_time p JOIN skill_tree_nodes n ON n.id = p.node_id ${treeId ? 'WHERE p.tree_id = ?' : ''} ORDER BY p.created_at DESC`, ...(treeId ? [treeId] : []));
  return { ...summarisePractice(rows.map(row => ({ kind: row.kind, durationMs: row.duration_ms, createdAt: row.created_at }))), recent: rows.slice(0, 10) };
}
