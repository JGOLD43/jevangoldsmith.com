import type { LearningCardState } from './types';

const TEN_MINUTES_IN_DAYS = 10 / (24 * 60);

export function scheduleCardReview(state: LearningCardState, remembered: boolean, now = new Date(), targetRetention = 0.9): LearningCardState {
  const difficulty = Math.max(1, Math.min(10, state.difficulty + (remembered ? -0.18 : 0.8)));
  let stability: number;
  let intervalDays: number;
  if (!remembered) {
    stability = Math.max(0.2, state.stability * 0.55);
    intervalDays = TEN_MINUTES_IN_DAYS;
  } else if (state.reviewCount === 0) {
    stability = 1;
    intervalDays = 1;
  } else {
    const growth = 1.55 + ((10 - difficulty) * 0.08);
    stability = Math.max(1, state.stability * growth);
    intervalDays = Math.max(1, stability * (Math.log(targetRetention) / Math.log(0.9)));
  }
  const due = new Date(now.getTime() + (intervalDays * 86_400_000));
  return { ...state, stability, difficulty, intervalDays, dueAt: due.toISOString(), reviewCount: state.reviewCount + 1, lapseCount: state.lapseCount + (remembered ? 0 : 1), lastReviewedAt: now.toISOString() };
}

export function emptyCardState(cardId: string, direction: LearningCardState['direction'], now = new Date()): LearningCardState {
  return { cardId, direction, stability: 0, difficulty: 5, dueAt: now.toISOString(), intervalDays: 0, reviewCount: 0, lapseCount: 0, lastReviewedAt: null };
}
