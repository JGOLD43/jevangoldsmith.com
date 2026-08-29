import * as Crypto from 'expo-crypto';

import { applyAdaptiveEvidence, emptyDimensionScores, estimateRetention } from '@/learning/adaptive-skill-engine';
import { CORE_SKILL_TREE_SEEDS, type CoreSkillTreeSeed } from '@/learning/core-skill-seeds';
import { FOCUSED_SKILL_TREE_SEEDS } from '@/learning/focused-skill-seeds';
import { emptySkillProgress, skillNodeDepth, skillNodeStatus, validatePrerequisites } from '@/learning/skill-tree-engine';
import { UPSKILLING_SEED_NODES, UPSKILLING_TREE_TITLE } from '@/learning/upskilling-seed';
import type { AttemptResult, SkillDimension, SkillPracticeEvidence, SkillSourceReference, SkillTree, SkillTreeAnalytics, SkillTreeDetail, SkillTreeNode, SkillTreeProgress, SkillTreeSummary } from '@/learning/types';
import { getDatabase } from './database';

type TreeRow = { id: string; title: string; description: string; created_at: string; updated_at: string };
type NodeRow = { id: string; tree_id: string; title: string; description: string; practice_prompt: string; success_criteria: string; prerequisites_json: string; dimension: SkillDimension; source_references_json: string; inference_confidence: number; created_at: string; updated_at: string };
type ProgressRow = { node_id: string; strength: number; clean_attempts: number; helped_attempts: number; misses: number; last_practiced_at: string | null; stability_days: number; difficulty: number; due_at: string | null; retention_estimate: number; dimension_scores_json: string };

const toTree = (row: TreeRow): SkillTree => ({ id: row.id, title: row.title, description: row.description, createdAt: row.created_at, updatedAt: row.updated_at });
const toNode = (row: NodeRow): SkillTreeNode => ({ id: row.id, treeId: row.tree_id, title: row.title, description: row.description, practicePrompt: row.practice_prompt, successCriteria: row.success_criteria, prerequisites: JSON.parse(row.prerequisites_json) as string[], dimension: row.dimension ?? 'procedural', sourceReferences: JSON.parse(row.source_references_json || '[]') as SkillSourceReference[], inferenceConfidence: row.inference_confidence ?? 1, createdAt: row.created_at, updatedAt: row.updated_at });
const toProgress = (row: ProgressRow): SkillTreeProgress => {
  const progress = { nodeId: row.node_id, strength: row.strength, cleanAttempts: row.clean_attempts, helpedAttempts: row.helped_attempts, misses: row.misses, lastPracticedAt: row.last_practiced_at, stabilityDays: row.stability_days ?? 0, difficulty: row.difficulty ?? 5, dueAt: row.due_at, retentionEstimate: row.retention_estimate ?? 0, dimensionScores: row.dimension_scores_json ? JSON.parse(row.dimension_scores_json) : emptyDimensionScores() } as SkillTreeProgress;
  return { ...progress, dimensionScores: { ...emptyDimensionScores(), ...progress.dimensionScores }, retentionEstimate: estimateRetention(progress) };
};

export async function getSkillTree(id: string): Promise<SkillTreeDetail | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<TreeRow>('SELECT * FROM skill_trees WHERE id = ?', id);
  if (!row) return null;
  const nodeRows = await database.getAllAsync<NodeRow>('SELECT * FROM skill_tree_nodes WHERE tree_id = ? ORDER BY created_at', id);
  const progressRows = await database.getAllAsync<ProgressRow>('SELECT p.* FROM skill_tree_progress p JOIN skill_tree_nodes n ON n.id = p.node_id WHERE n.tree_id = ?', id);
  const nodes = nodeRows.map(toNode);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const progressByNode = new Map(progressRows.map((item) => [item.node_id, toProgress(item)]));
  return { ...toTree(row), nodes: nodes.map((node) => {
    const progress = progressByNode.get(node.id) ?? emptySkillProgress(node.id);
    return { ...node, depth: skillNodeDepth(node.id, nodesById), status: skillNodeStatus(node, progress, progressByNode), progress };
  }).sort((left, right) => left.depth - right.depth || left.createdAt.localeCompare(right.createdAt)) };
}

export async function listSkillTrees(): Promise<SkillTreeSummary[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<TreeRow>('SELECT * FROM skill_trees ORDER BY updated_at DESC');
  const details = await Promise.all(rows.map((row) => getSkillTree(row.id)));
  return details.filter((tree): tree is SkillTreeDetail => Boolean(tree)).map((tree) => ({
    id: tree.id, title: tree.title, description: tree.description, createdAt: tree.createdAt, updatedAt: tree.updatedAt,
    nodeCount: tree.nodes.length,
    reliableCount: tree.nodes.filter((node) => node.status === 'reliable' || node.status === 'mastered').length,
    readyCount: tree.nodes.filter((node) => node.status === 'ready' || node.status === 'practising').length,
  }));
}

export async function createSkillTree(title: string, description: string): Promise<SkillTree> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const tree = { id: Crypto.randomUUID(), title: title.trim(), description: description.trim(), createdAt: now, updatedAt: now };
  await database.runAsync('INSERT INTO skill_trees (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', tree.id, tree.title, tree.description, now, now);
  return tree;
}

export async function addSkillTreeNode(input: { treeId: string; title: string; description: string; practicePrompt: string; successCriteria: string; prerequisites: string[]; dimension?: SkillDimension; sourceReferences?: SkillSourceReference[]; inferenceConfidence?: number }): Promise<string> {
  const tree = await getSkillTree(input.treeId);
  if (!tree) throw new Error('This skill tree could not be found.');
  const id = Crypto.randomUUID();
  validatePrerequisites(id, input.prerequisites, tree.nodes);
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync('INSERT INTO skill_tree_nodes (id, tree_id, title, description, practice_prompt, success_criteria, prerequisites_json, dimension, source_references_json, inference_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', id, input.treeId, input.title.trim(), input.description.trim(), input.practicePrompt.trim(), input.successCriteria.trim(), JSON.stringify(input.prerequisites), input.dimension ?? 'procedural', JSON.stringify(input.sourceReferences ?? []), Math.max(0, Math.min(1, input.inferenceConfidence ?? 1)), now, now);
  await database.runAsync('INSERT INTO skill_tree_progress (node_id) VALUES (?)', id);
  await database.runAsync('UPDATE skill_trees SET updated_at = ? WHERE id = ?', now, input.treeId);
  return id;
}

export async function recordSkillTreeAttempt(treeId: string, nodeId: string, result: AttemptResult, details: Partial<Omit<SkillPracticeEvidence, 'result'>> = {}): Promise<SkillTreeProgress> {
  const tree = await getSkillTree(treeId);
  const node = tree?.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error('This ability could not be found.');
  if (node.status === 'locked') throw new Error('Complete its prerequisites before practising this ability.');
  const evidence: SkillPracticeEvidence = { result, dimension: details.dimension ?? node.dimension, responseMs: details.responseMs ?? 0, hintCount: details.hintCount ?? (result === 'helped' ? 1 : 0), transferContext: details.transferContext ?? node.dimension === 'transfer', practicedAt: details.practicedAt };
  const retentionBefore = estimateRetention(node.progress, evidence.practicedAt ? new Date(evidence.practicedAt) : new Date());
  const next = applyAdaptiveEvidence(node.progress, evidence);
  const database = await getDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('UPDATE skill_tree_progress SET strength = ?, clean_attempts = ?, helped_attempts = ?, misses = ?, last_practiced_at = ?, stability_days = ?, difficulty = ?, due_at = ?, retention_estimate = ?, dimension_scores_json = ? WHERE node_id = ?', next.strength, next.cleanAttempts, next.helpedAttempts, next.misses, next.lastPracticedAt, next.stabilityDays, next.difficulty, next.dueAt, next.retentionEstimate, JSON.stringify(next.dimensionScores), nodeId);
    await transaction.runAsync('INSERT INTO skill_tree_attempts (id, tree_id, node_id, result, dimension, response_ms, hint_count, transfer_context, strength_before, strength_after, retention_before, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', Crypto.randomUUID(), treeId, nodeId, result, evidence.dimension, Math.max(0, Math.round(evidence.responseMs)), Math.max(0, Math.round(evidence.hintCount)), evidence.transferContext ? 1 : 0, node.progress.strength, next.strength, retentionBefore, next.lastPracticedAt);
    await transaction.runAsync('UPDATE skill_trees SET updated_at = ? WHERE id = ?', next.lastPracticedAt, treeId);
  });
  return next;
}

export async function getSkillTreeAnalytics(treeId: string): Promise<SkillTreeAnalytics> {
  const database = await getDatabase();
  const tree = await getSkillTree(treeId);
  const attempts = await database.getAllAsync<{ result: AttemptResult; response_ms: number; hint_count: number; transfer_context: number; strength_before: number; strength_after: number; dimension: SkillDimension; created_at: string }>('SELECT result, response_ms, hint_count, transfer_context, strength_before, strength_after, dimension, created_at FROM skill_tree_attempts WHERE tree_id = ? ORDER BY created_at', treeId);
  const clean = attempts.filter((attempt) => attempt.result === 'clean');
  const transfer = attempts.filter((attempt) => attempt.transfer_context === 1);
  const responses = attempts.map((attempt) => attempt.response_ms).filter((value) => value > 0).sort((a, b) => a - b);
  const dimensions = emptyDimensionScores();
  for (const dimension of Object.keys(dimensions) as SkillDimension[]) {
    const values = tree?.nodes.map((node) => node.progress.dimensionScores[dimension]).filter((value) => value > 0) ?? [];
    dimensions[dimension] = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const recent = attempts.filter((attempt) => attempt.created_at >= cutoff);
  const nodes = tree?.nodes ?? [];
  return {
    attempts: attempts.length,
    cleanRate: attempts.length ? Math.round((clean.length / attempts.length) * 100) : 0,
    medianResponseMs: responses.length ? responses[Math.floor(responses.length / 2)] : 0,
    estimatedRetention: nodes.length ? Math.round((nodes.reduce((sum, node) => sum + estimateRetention(node.progress), 0) / nodes.length) * 100) : 0,
    dueCount: nodes.filter((node) => !node.progress.dueAt || node.progress.dueAt <= new Date().toISOString()).length,
    reliableCount: nodes.filter((node) => node.status === 'reliable' || node.status === 'mastered').length,
    masteredCount: nodes.filter((node) => node.status === 'mastered').length,
    transferRate: transfer.length ? Math.round((transfer.filter((attempt) => attempt.result === 'clean').length / transfer.length) * 100) : 0,
    independentRate: attempts.length ? Math.round((attempts.filter((attempt) => attempt.result === 'clean' && attempt.hint_count === 0).length / attempts.length) * 100) : 0,
    growthLast30Days: recent.reduce((sum, attempt) => sum + attempt.strength_after - attempt.strength_before, 0),
    dimensionScores: dimensions,
  };
}

export async function ensureUpskillingSkillTree(): Promise<string> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>('SELECT id FROM skill_trees WHERE title = ? COLLATE NOCASE LIMIT 1', UPSKILLING_TREE_TITLE);
  if (existing) return existing.id;
  const tree = await createSkillTree(UPSKILLING_TREE_TITLE, 'A source-grounded training system built from your Justin Skycak highlights and Math Academy’s adaptive-learning methodology.');
  const book = await database.getFirstAsync<{ id: string; title: string }>("SELECT id, title FROM books WHERE lower(title) LIKE '%advice%upskilling%' ORDER BY updated_at DESC LIMIT 1");
  const annotations = book ? await database.getAllAsync<{ id: string; locator: string; selected_text: string; note: string }>("SELECT id, locator, selected_text, note FROM book_annotations WHERE book_id = ? AND kind IN ('highlight', 'note') ORDER BY created_at", book.id) : [];
  const ids = new Map<string, string>();
  for (const spec of UPSKILLING_SEED_NODES) {
    const sourceReferences: SkillSourceReference[] = [];
    for (const annotation of annotations) {
      const text = [annotation.selected_text, annotation.note].filter(Boolean).join(' — ').trim();
      if (!text || !spec.sourcePatterns.some((pattern) => pattern.test(text))) continue;
      sourceReferences.push({ annotationId: annotation.id, bookId: book?.id ?? '', bookTitle: book?.title ?? 'Advice on Upskilling', locator: annotation.locator, excerpt: text.slice(0, 420) });
      if (sourceReferences.length >= 2) break;
    }
    if (spec.mathAcademySource) sourceReferences.push({ annotationId: `math-academy-${spec.key}`, bookId: '', bookTitle: 'Math Academy · How Our AI Works', locator: 'mathacademy.com/how-our-ai-works', excerpt: spec.mathAcademySource });
    const prerequisites = spec.prerequisiteKeys.map((key) => ids.get(key)).filter((id): id is string => Boolean(id));
    const id = await addSkillTreeNode({ treeId: tree.id, title: spec.title, description: spec.description, practicePrompt: spec.practicePrompt, successCriteria: spec.successCriteria, prerequisites, dimension: spec.dimension, sourceReferences, inferenceConfidence: 0.96 });
    ids.set(spec.key, id);
  }
  return tree.id;
}

async function ensureCoreSkillTree(seed: CoreSkillTreeSeed): Promise<string> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>('SELECT id FROM skill_trees WHERE title = ? COLLATE NOCASE LIMIT 1', seed.title);
  const tree = existing ? await getSkillTree(existing.id) : await createSkillTree(seed.title, seed.description).then((created) => getSkillTree(created.id));
  if (!tree) throw new Error(`Could not prepare the ${seed.title} skill tree.`);
  const ids = new Map<string, string>();
  const existingByTitle = new Map(tree.nodes.map((node) => [node.title.toLocaleLowerCase(), node.id]));
  const pending: { id: string; spec: CoreSkillTreeSeed['nodes'][number]; prerequisites: string[] }[] = [];
  for (const spec of seed.nodes) {
    const found = existingByTitle.get(spec.title.toLocaleLowerCase());
    if (found) { ids.set(spec.key, found); continue; }
    const prerequisites = spec.prerequisiteKeys.map((key) => ids.get(key)).filter((id): id is string => Boolean(id));
    if (prerequisites.length !== spec.prerequisiteKeys.length) throw new Error(`${spec.title} has an unresolved prerequisite.`);
    const id = Crypto.randomUUID();
    pending.push({ id, spec, prerequisites });
    ids.set(spec.key, id);
  }
  if (pending.length) {
    const now = new Date().toISOString();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      for (const item of pending) {
        await transaction.runAsync('INSERT INTO skill_tree_nodes (id, tree_id, title, description, practice_prompt, success_criteria, prerequisites_json, dimension, source_references_json, inference_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', item.id, tree.id, item.spec.title, item.spec.description, item.spec.practicePrompt, item.spec.successCriteria, JSON.stringify(item.prerequisites), item.spec.dimension, '[]', 0.9, now, now);
        await transaction.runAsync('INSERT INTO skill_tree_progress (node_id) VALUES (?)', item.id);
      }
      await transaction.runAsync('UPDATE skill_trees SET updated_at = ? WHERE id = ?', now, tree.id);
    });
  }
  return tree.id;
}

export async function ensureCoreSkillTrees(): Promise<string[]> {
  const ids: string[] = [await ensureUpskillingSkillTree()];
  for (const seed of [...CORE_SKILL_TREE_SEEDS, ...FOCUSED_SKILL_TREE_SEEDS]) ids.push(await ensureCoreSkillTree(seed));
  return ids;
}

export async function deleteSkillTree(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM skill_trees WHERE id = ?', id);
}
