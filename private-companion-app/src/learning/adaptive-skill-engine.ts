import type { AttemptResult, SkillDimension, SkillPracticeEvidence, SkillTreeNodeView, SkillTreeProgress } from './types';

export const SKILL_DIMENSIONS: SkillDimension[] = ['conceptual', 'procedural', 'conditional', 'discrimination', 'transfer'];

export const SKILL_DIMENSION_LABELS: Record<SkillDimension, string> = {
  conceptual: 'Understand',
  procedural: 'Do',
  conditional: 'Choose when',
  discrimination: 'Tell apart',
  transfer: 'Apply elsewhere',
};

export function emptyDimensionScores(): Record<SkillDimension, number> {
  return { conceptual: 0, procedural: 0, conditional: 0, discrimination: 0, transfer: 0 };
}

export function estimateRetention(progress: Pick<SkillTreeProgress, 'stabilityDays' | 'lastPracticedAt'>, at = new Date()): number {
  if (!progress.lastPracticedAt || progress.stabilityDays <= 0) return 0;
  const elapsedDays = Math.max(0, (at.getTime() - new Date(progress.lastPracticedAt).getTime()) / 86_400_000);
  return Math.max(0, Math.min(1, Math.exp(-elapsedDays / progress.stabilityDays)));
}

function nextStability(current: number, result: AttemptResult, difficulty: number, delayedSuccess: boolean): number {
  if (result === 'missed') return Math.max(0.35, current * 0.45);
  const base = Math.max(0.5, current);
  const gain = result === 'clean' ? (delayedSuccess ? 2.15 : 1.55) : 1.18;
  return Math.min(3650, base * gain * (1.12 - (difficulty * 0.035)));
}

export function applyAdaptiveEvidence(progress: SkillTreeProgress, evidence: SkillPracticeEvidence): SkillTreeProgress {
  const practicedAt = evidence.practicedAt ? new Date(evidence.practicedAt) : new Date();
  const retentionBefore = estimateRetention(progress, practicedAt);
  const delayedSuccess = evidence.result === 'clean' && retentionBefore > 0 && retentionBefore < 0.82;
  const cleanAttempts = progress.cleanAttempts + (evidence.result === 'clean' ? 1 : 0);
  const helpedAttempts = progress.helpedAttempts + (evidence.result === 'helped' ? 1 : 0);
  const misses = progress.misses + (evidence.result === 'missed' ? 1 : 0);
  const independencePenalty = Math.min(9, evidence.hintCount * 3);
  const speedBonus = evidence.responseMs > 0 && evidence.responseMs <= 20_000 ? 3 : 0;
  const transferBonus = evidence.transferContext && evidence.result === 'clean' ? 5 : 0;
  const delta = evidence.result === 'clean' ? 16 + speedBonus + transferBonus - independencePenalty : evidence.result === 'helped' ? 5 - independencePenalty : -12;
  const strength = Math.max(0, Math.min(100, progress.strength + delta));
  const difficultyDelta = evidence.result === 'missed' ? 0.55 : evidence.result === 'helped' ? 0.18 : -0.22;
  const difficulty = Math.max(1, Math.min(10, progress.difficulty + difficultyDelta));
  const stabilityDays = nextStability(progress.stabilityDays, evidence.result, difficulty, delayedSuccess);
  const intervalDays = evidence.result === 'missed' ? 1 : Math.max(1, Math.round(stabilityDays * 0.78));
  const due = new Date(practicedAt);
  due.setUTCDate(due.getUTCDate() + intervalDays);
  const currentDimension = progress.dimensionScores[evidence.dimension] ?? 0;
  const dimensionDelta = evidence.result === 'clean' ? 18 + transferBonus - independencePenalty : evidence.result === 'helped' ? Math.max(0, 6 - independencePenalty) : -10;
  return {
    ...progress,
    strength,
    cleanAttempts,
    helpedAttempts,
    misses,
    lastPracticedAt: practicedAt.toISOString(),
    stabilityDays,
    difficulty,
    dueAt: due.toISOString(),
    retentionEstimate: 1,
    dimensionScores: { ...progress.dimensionScores, [evidence.dimension]: Math.max(0, Math.min(100, currentDimension + dimensionDelta)) },
  };
}

export function adaptivePriority(node: SkillTreeNodeView, at = new Date()): number {
  if (node.status === 'locked') return Number.NEGATIVE_INFINITY;
  const retention = estimateRetention(node.progress, at);
  const overdue = !node.progress.dueAt || node.progress.dueAt <= at.toISOString() ? 1.7 : 0.75;
  const frontier = node.status === 'ready' || node.status === 'practising' ? 1.35 : 1;
  const transferGap = (100 - node.progress.dimensionScores.transfer) / 100;
  const weakestDimension = Math.min(...SKILL_DIMENSIONS.map((dimension) => node.progress.dimensionScores[dimension]));
  return overdue * frontier * (1 + (1 - retention)) * (1 + transferGap * 0.35) * (1 + (100 - weakestDimension) / 250);
}

export function chooseNextSkill(nodes: SkillTreeNodeView[], at = new Date()): SkillTreeNodeView | null {
  return nodes.filter((node) => node.status !== 'locked').sort((left, right) => adaptivePriority(right, at) - adaptivePriority(left, at))[0] ?? null;
}
