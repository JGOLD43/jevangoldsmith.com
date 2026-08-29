import type { AttemptResult, FrenchSkill, LearningExercise, LearningSessionPlan, LearningSkillState, LearningSkillStatus } from './types';

const STATUS_RANK: Record<LearningSkillStatus, number> = { locked: 0, ready: 1, learning: 2, reliable: 3, automatic: 4 };
const REVIEW_DAYS = [1, 3, 7, 14, 30, 60];

export function prerequisitesMet(skill: FrenchSkill, states: Map<string, LearningSkillState>): boolean {
  return skill.prerequisites.every((id) => STATUS_RANK[states.get(id)?.status ?? 'locked'] >= STATUS_RANK.reliable);
}

export function resolvedStatus(skill: FrenchSkill, state: LearningSkillState | undefined, states: Map<string, LearningSkillState>): LearningSkillStatus {
  if (state && STATUS_RANK[state.status] >= STATUS_RANK.learning) return state.status;
  return prerequisitesMet(skill, states) ? 'ready' : skill.prerequisites.length ? 'locked' : 'ready';
}

export function applyAttempt(state: LearningSkillState, result: AttemptResult, at = new Date()): LearningSkillState {
  const clean = state.cleanRetrievals + (result === 'clean' ? 1 : 0);
  const helped = state.helpedRetrievals + (result === 'helped' ? 1 : 0);
  const misses = state.misses + (result === 'missed' ? 1 : 0);
  const delta = result === 'clean' ? 20 : result === 'helped' ? 7 : -8;
  const strength = Math.max(0, Math.min(100, state.strength + delta));
  const status: LearningSkillStatus = clean >= 8 && strength >= 85 ? 'automatic' : clean >= 3 && strength >= 60 ? 'reliable' : 'learning';
  const reviewIndex = result === 'clean' ? Math.min(REVIEW_DAYS.length - 1, Math.max(0, clean - 1)) : 0;
  const review = new Date(at);
  review.setDate(review.getDate() + REVIEW_DAYS[reviewIndex]);
  return { ...state, status, strength, cleanRetrievals: clean, helpedRetrievals: helped, misses, lastAttemptAt: at.toISOString(), nextReviewAt: review.toISOString() };
}

export function priorityScore(skill: FrenchSkill, state: LearningSkillState | undefined, now = new Date()): number {
  const weakness = 1 + ((100 - (state?.strength ?? 0)) / 100);
  const due = !state?.nextReviewAt || state.nextReviewAt <= now.toISOString() ? 2 : 0.7;
  return ((skill.unlockLeverage * 1.4) + skill.realWorldFrequency) * weakness * due / Math.max(1, skill.estimatedSeconds / 60);
}

function exerciseFor(skill: FrenchSkill, sequence: number): LearningExercise {
  const answer = skill.phrases.join('\n');
  const prompts: Record<FrenchSkill['kind'], string> = {
    retrieve: `Say this in French without looking: ${skill.ability}`,
    respond: `Respond aloud in French: ${skill.ability}`,
    repair: `You did not understand. Keep the conversation in French: ${skill.ability}`,
    fluency: `Speak aloud from memory: ${skill.ability}`,
    real_world: `Run the real-life scene aloud: ${skill.ability}`,
  };
  return { id: `${skill.id}-${sequence}`, skillId: skill.id, kind: skill.kind, prompt: prompts[skill.kind], answer, coachingNote: skill.meaning, targetSeconds: skill.kind === 'fluency' || skill.kind === 'real_world' ? 120 : 35 };
}

export function buildSessionPlan(skills: FrenchSkill[], stateList: LearningSkillState[], durationMinutes: number, now = new Date()): LearningSessionPlan {
  const states = new Map(stateList.map((state) => [state.skillId, state]));
  const available = skills.filter((skill) => resolvedStatus(skill, states.get(skill.id), states) !== 'locked')
    .sort((a, b) => priorityScore(b, states.get(b.id), now) - priorityScore(a, states.get(a.id), now));
  const exerciseBudget = Math.max(4, Math.min(14, Math.floor(durationMinutes / 2)));
  const selected = available.slice(0, Math.min(6, available.length));
  const exercises: LearningExercise[] = [];
  for (let index = 0; index < exerciseBudget; index += 1) {
    const skill = selected[index % selected.length];
    if (skill) exercises.push(exerciseFor(skill, index));
  }
  const phrases = [...new Set(selected.flatMap((skill) => skill.phrases))];
  const focus = selected.slice(0, 3).map((skill) => skill.title).join(' · ');
  const voiceBrief = [
    `French rapid-practice session: ${durationMinutes} minutes.`,
    `Focus: ${focus}.`,
    `Target phrases: ${phrases.join(' | ')}.`,
    'Method: prompt retrieval before showing an answer; correct briefly; repeat the real-world task under tighter time; then vary the context.',
    'Stay in French except for a minimal clarification. Do not receive or request unrelated private app data.',
  ].join('\n');
  return { id: `${now.getTime()}`, durationMinutes, createdAt: now.toISOString(), focus, phrases, exercises, voiceBrief };
}

export function assertAcyclic(skills: FrenchSkill[]): boolean {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) if (!visit(prerequisite)) return false;
    visiting.delete(id); visited.add(id); return true;
  };
  return skills.every((skill) => visit(skill.id));
}
