import type { AttemptResult, SkillTreeNode, SkillTreeNodeStatus, SkillTreeProgress } from './types';

export function emptySkillProgress(nodeId: string): SkillTreeProgress {
  return { nodeId, strength: 0, cleanAttempts: 0, helpedAttempts: 0, misses: 0, lastPracticedAt: null, stabilityDays: 0, difficulty: 5, dueAt: null, retentionEstimate: 0, dimensionScores: { conceptual: 0, procedural: 0, conditional: 0, discrimination: 0, transfer: 0 } };
}

export function isReliable(progress: SkillTreeProgress): boolean {
  return progress.cleanAttempts >= 3 && progress.strength >= 60;
}

export function isMastered(progress: SkillTreeProgress): boolean {
  return progress.cleanAttempts >= 8 && progress.strength >= 85;
}

export function skillNodeStatus(node: SkillTreeNode, progress: SkillTreeProgress, progressByNode: Map<string, SkillTreeProgress>): SkillTreeNodeStatus {
  if (isMastered(progress)) return 'mastered';
  if (isReliable(progress)) return 'reliable';
  if (!node.prerequisites.every((id) => isReliable(progressByNode.get(id) ?? emptySkillProgress(id)))) return 'locked';
  return progress.cleanAttempts + progress.helpedAttempts + progress.misses > 0 ? 'practising' : 'ready';
}

export function skillNodeDepth(nodeId: string, nodesById: Map<string, SkillTreeNode>, trail = new Set<string>()): number {
  if (trail.has(nodeId)) throw new Error('A skill cannot depend on itself.');
  const node = nodesById.get(nodeId);
  if (!node || node.prerequisites.length === 0) return 0;
  const nextTrail = new Set(trail).add(nodeId);
  return 1 + Math.max(...node.prerequisites.map((id) => skillNodeDepth(id, nodesById, nextTrail)));
}

export function validatePrerequisites(nodeId: string, prerequisites: string[], nodes: SkillTreeNode[]): void {
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (prerequisites.includes(nodeId)) throw new Error('A skill cannot require itself.');
  if (prerequisites.some((id) => !nodeIds.has(id))) throw new Error('One of the prerequisites no longer exists.');
  const candidate = new Map(nodes.map((node) => [node.id, node]));
  const current = candidate.get(nodeId);
  if (current) candidate.set(nodeId, { ...current, prerequisites });
  for (const id of candidate.keys()) skillNodeDepth(id, candidate);
}

export function applySkillAttempt(progress: SkillTreeProgress, result: AttemptResult, practicedAt = new Date().toISOString()): SkillTreeProgress {
  return {
    ...progress,
    strength: Math.max(0, Math.min(100, progress.strength + (result === 'clean' ? 20 : result === 'helped' ? 7 : -8))),
    cleanAttempts: progress.cleanAttempts + (result === 'clean' ? 1 : 0),
    helpedAttempts: progress.helpedAttempts + (result === 'helped' ? 1 : 0),
    misses: progress.misses + (result === 'missed' ? 1 : 0),
    lastPracticedAt: practicedAt,
  };
}
