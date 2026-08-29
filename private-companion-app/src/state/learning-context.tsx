import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { buildSessionPlan } from '@/learning/engine';
import { FRENCH_SKILLS } from '@/learning/french-seed';
import type { AttemptResult, LearningDashboard, LearningSessionPlan, LearningSkillState } from '@/learning/types';
import { completeLearningMilestone, finishLearningSession, getLearningDashboard, listLearningStates, recordLearningAttempt, startLearningSession } from '@/storage/learning-repository';

type LearningContextValue = { dashboard: LearningDashboard | null; states: LearningSkillState[]; loading: boolean; refresh: () => Promise<void>; createPlan: (minutes: number) => Promise<LearningSessionPlan>; recordAttempt: (plan: LearningSessionPlan, exerciseIndex: number, result: AttemptResult, seconds: number) => Promise<void>; finishSession: (planId: string, seconds: number) => Promise<void>; recordMilestone: (milestoneId: string) => Promise<void> };
const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: PropsWithChildren) {
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [states, setStates] = useState<LearningSkillState[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { const [nextDashboard, nextStates] = await Promise.all([getLearningDashboard(), listLearningStates()]); setDashboard(nextDashboard); setStates(nextStates); setLoading(false); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const createPlan = useCallback(async (minutes: number) => { const plan = buildSessionPlan(FRENCH_SKILLS, await listLearningStates(), minutes); await startLearningSession(plan); return plan; }, []);
  const recordAttempt = useCallback(async (plan: LearningSessionPlan, exerciseIndex: number, result: AttemptResult, seconds: number) => { const exercise = plan.exercises[exerciseIndex]; if (exercise) await recordLearningAttempt({ sessionId: plan.id, skillId: exercise.skillId, kind: exercise.kind, result, responseSeconds: seconds }); }, []);
  const finishSession = useCallback(async (planId: string, seconds: number) => { await finishLearningSession(planId, seconds); await refresh(); }, [refresh]);
  const recordMilestone = useCallback(async (milestoneId: string) => { await completeLearningMilestone(milestoneId, 'Passed in a real interaction.'); await refresh(); }, [refresh]);
  const value = useMemo(() => ({ dashboard, states, loading, refresh, createPlan, recordAttempt, finishSession, recordMilestone }), [dashboard, states, loading, refresh, createPlan, recordAttempt, finishSession, recordMilestone]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning(): LearningContextValue { const value = useContext(LearningContext); if (!value) throw new Error('useLearning must be used inside LearningProvider.'); return value; }
