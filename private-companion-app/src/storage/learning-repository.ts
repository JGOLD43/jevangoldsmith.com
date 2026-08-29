import * as Crypto from 'expo-crypto';

import { applyAttempt } from '@/learning/engine';
import { FRENCH_MILESTONES, FRENCH_SKILLS } from '@/learning/french-seed';
import type { AttemptResult, LearningDashboard, LearningMilestone, LearningSessionPlan, LearningSkillState } from '@/learning/types';

import { getDatabase } from './database';

type StateRow = { skill_id: string; status: LearningSkillState['status']; strength: number; clean_retrievals: number; helped_retrievals: number; misses: number; next_review_at: string | null; last_attempt_at: string | null };

function mapState(row: StateRow): LearningSkillState {
  return { skillId: row.skill_id, status: row.status, strength: row.strength, cleanRetrievals: row.clean_retrievals, helpedRetrievals: row.helped_retrievals, misses: row.misses, nextReviewAt: row.next_review_at, lastAttemptAt: row.last_attempt_at };
}

function emptyState(skillId: string): LearningSkillState {
  return { skillId, status: 'ready', strength: 0, cleanRetrievals: 0, helpedRetrievals: 0, misses: 0, nextReviewAt: null, lastAttemptAt: null };
}

export async function listLearningStates(): Promise<LearningSkillState[]> {
  const rows = await (await getDatabase()).getAllAsync<StateRow>('SELECT * FROM learning_skill_states');
  const stored = new Map(rows.map((row) => [row.skill_id, mapState(row)]));
  return FRENCH_SKILLS.map((skill) => stored.get(skill.id) ?? emptyState(skill.id));
}

export async function startLearningSession(plan: LearningSessionPlan): Promise<void> {
  await (await getDatabase()).runAsync('INSERT INTO learning_sessions (id, language, duration_minutes, focus, plan_json, started_at) VALUES (?, ?, ?, ?, ?, ?)', plan.id, 'fr', plan.durationMinutes, plan.focus, JSON.stringify(plan), plan.createdAt);
}

export async function recordLearningAttempt(input: { sessionId: string; skillId: string; kind: string; result: AttemptResult; responseSeconds: number }): Promise<LearningSkillState> {
  const database = await getDatabase();
  const now = new Date();
  let next = emptyState(input.skillId);
  await database.withTransactionAsync(async () => {
    const row = await database.getFirstAsync<StateRow>('SELECT * FROM learning_skill_states WHERE skill_id = ?', input.skillId);
    next = applyAttempt(row ? mapState(row) : next, input.result, now);
    await database.runAsync(`INSERT INTO learning_skill_states
      (skill_id, status, strength, clean_retrievals, helped_retrievals, misses, next_review_at, last_attempt_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(skill_id) DO UPDATE SET status=excluded.status, strength=excluded.strength,
      clean_retrievals=excluded.clean_retrievals, helped_retrievals=excluded.helped_retrievals,
      misses=excluded.misses, next_review_at=excluded.next_review_at, last_attempt_at=excluded.last_attempt_at`,
    next.skillId, next.status, next.strength, next.cleanRetrievals, next.helpedRetrievals, next.misses, next.nextReviewAt, next.lastAttemptAt);
    await database.runAsync('INSERT INTO learning_attempts (id, session_id, skill_id, exercise_kind, result, response_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', Crypto.randomUUID(), input.sessionId, input.skillId, input.kind, input.result, Math.max(0, Math.round(input.responseSeconds)), now.toISOString());
  });
  return next;
}

export async function finishLearningSession(sessionId: string, elapsedSeconds: number): Promise<void> {
  await (await getDatabase()).runAsync('UPDATE learning_sessions SET ended_at=?, elapsed_seconds=? WHERE id=?', new Date().toISOString(), Math.max(0, Math.round(elapsedSeconds)), sessionId);
}

export async function completeLearningMilestone(milestoneId: string, note = ''): Promise<void> {
  await (await getDatabase()).runAsync('INSERT OR REPLACE INTO learning_milestone_evidence (milestone_id, completed_at, note) VALUES (?, ?, ?)', milestoneId, new Date().toISOString(), note.trim());
}

export async function listCompletedMilestoneIds(): Promise<string[]> {
  const rows = await (await getDatabase()).getAllAsync<{ milestone_id: string }>('SELECT milestone_id FROM learning_milestone_evidence ORDER BY completed_at');
  return rows.map((row) => row.milestone_id);
}

function localDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function streakFor(days: string[]): number {
  const unique = new Set(days);
  const cursor = new Date(); cursor.setHours(12, 0, 0, 0);
  if (!unique.has(localDate(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (unique.has(localDate(cursor.toISOString()))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

export async function getLearningDashboard(): Promise<LearningDashboard> {
  const database = await getDatabase();
  const states = await listLearningStates();
  const sessions = await database.getAllAsync<{ started_at: string; elapsed_seconds: number }>('SELECT started_at, elapsed_seconds FROM learning_sessions WHERE elapsed_seconds > 0 ORDER BY started_at');
  const completed = new Set(await listCompletedMilestoneIds());
  const nextMilestone = FRENCH_MILESTONES.find((milestone) => !completed.has(milestone.id)) ?? null;
  const reliable = new Set(states.filter((state) => state.status === 'reliable' || state.status === 'automatic').map((state) => state.skillId));
  const milestoneProgress = nextMilestone ? Math.round(nextMilestone.requiredSkillIds.filter((id) => reliable.has(id)).length / nextMilestone.requiredSkillIds.length * 100) : 100;
  const byDate = new Map<string, { value: number; count: number }>();
  for (const session of sessions) {
    const date = localDate(session.started_at); const prior = byDate.get(date) ?? { value: 0, count: 0 };
    prior.value += Math.round(session.elapsed_seconds / 60); prior.count += 1; byDate.set(date, prior);
  }
  const today = localDate(new Date().toISOString());
  return {
    totalMinutes: Math.round(sessions.reduce((sum, session) => sum + session.elapsed_seconds, 0) / 60), todayMinutes: byDate.get(today)?.value ?? 0,
    currentStreak: streakFor([...byDate.keys()]), reliableSkills: reliable.size, totalSkills: FRENCH_SKILLS.length,
    dueReviews: states.filter((state) => state.nextReviewAt && state.nextReviewAt <= new Date().toISOString()).length,
    nextMilestone, milestoneProgress, recentActivity: [...byDate].map(([date, value]) => ({ date, ...value })),
  };
}

export function milestoneById(id: string): LearningMilestone | undefined {
  return FRENCH_MILESTONES.find((milestone) => milestone.id === id);
}

