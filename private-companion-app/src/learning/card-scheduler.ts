import type { LearningCardState } from './types';

export type CardRating = 'again' | 'hard' | 'good' | 'easy';
export const CARD_RATINGS: CardRating[] = ['again', 'hard', 'good', 'easy'];
// A transparent interval scheduler, not FSRS. Old boolean callers remain compatible.
export function scheduleCardReview(state: LearningCardState, rating: CardRating | boolean, now = new Date(), targetRetention = 0.9): LearningCardState {
  const grade = typeof rating === 'boolean' ? (rating ? 'good' : 'again') : rating;
  const difficulty = Math.max(1, Math.min(10, state.difficulty + ({ again: .8, hard: .25, good: -.18, easy: -.5 }[grade])));
  const learning = state.reviewCount === 0 || state.intervalDays < 1;
  let intervalDays: number;
  if (grade === 'again') intervalDays = 10 / 1440;
  else if (learning) intervalDays = grade === 'hard' ? 30 / 1440 : grade === 'easy' ? 4 : 1;
  else {
    const base = Math.max(1, state.intervalDays);
    const retention = Math.max(.7, Math.min(.99, targetRetention));
    const growth = 1.55 + (10 - difficulty) * .08;
    intervalDays = grade === 'hard' ? base * 1.2 : Math.max(base * 1.3, base * growth * Math.log(retention) / Math.log(.9)) * (grade === 'easy' ? 1.5 : 1);
    intervalDays = Math.min(3650, intervalDays);
  }
  return { ...state, stability: intervalDays >= 1 ? intervalDays : Math.max(.2, state.stability * (grade === 'again' ? .55 : 1)), difficulty, intervalDays, dueAt: new Date(now.getTime() + intervalDays * 86400000).toISOString(), reviewCount: state.reviewCount + 1, lapseCount: state.lapseCount + (grade === 'again' ? 1 : 0), lastReviewedAt: now.toISOString() };
}
export function reviewIntervalLabel(days: number): string {
  if (days < 1 / 24) return `${Math.round(days * 1440)} min`;
  if (days < 1) return `${Math.round(days * 24)} hr`;
  return `${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`;
}
export function emptyCardState(cardId: string, direction: LearningCardState['direction'], now = new Date()): LearningCardState {
  return { cardId, direction, stability: 0, difficulty: 5, dueAt: now.toISOString(), intervalDays: 0, reviewCount: 0, lapseCount: 0, lastReviewedAt: null };
}
