import type { LearningCard, ReviewCard } from './types';
export type CardKind = 'recall' | 'explain' | 'compare' | 'apply';
export const CARD_KINDS: { key: CardKind; label: string; hint: string }[] = [
  { key: 'recall', label: 'Recall', hint: 'Ask one clear question with a specific answer.' },
  { key: 'explain', label: 'Explain', hint: 'Ask how or why an idea works. Answer in your own words.' },
  { key: 'compare', label: 'Compare', hint: 'Distinguish two ideas that are easy to confuse.' },
  { key: 'apply', label: 'Apply', hint: 'Describe a situation. Ask which idea to use and why.' },
];
export type CardInput = Pick<LearningCard, 'deckName' | 'front' | 'back'> & Partial<Pick<LearningCard, 'note' | 'tags' | 'reverseEnabled' | 'bookId' | 'sourceLabel' | 'sourceKey' | 'promptKind'>>;
export function validateCard(input: CardInput) {
  const deckName = input.deckName.trim(), front = input.front.trim(), back = input.back.trim();
  if (!deckName || !front || !back) throw new Error('Add a topic, a question and an answer before saving.');
  if (deckName.length > 120 || front.length > 4000 || back.length > 12000 || (input.note?.length ?? 0) > 16000) throw new Error('Keep the topic under 120 characters, question under 4,000 and answer under 12,000.');
  return { ...input, deckName, front, back, note: input.note?.trim() ?? '', tags: [...new Set((input.tags ?? []).map(t => t.trim()).filter(Boolean))], reverseEnabled: input.reverseEnabled ?? false, promptKind: input.promptKind ?? 'recall', bookId: input.bookId ?? null, sourceLabel: input.sourceLabel ?? '', sourceKey: input.sourceKey ?? null };
}
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
// Keep overdue work ahead of new material, mix topics, and avoid revealing the
// reverse answer to a card in the same session. Shuffle draws from the full pool.
export function selectReviewCards(cards: ReviewCard[], mode: 'due' | 'cram', limit = 24, random = Math.random) {
  const ordered = mode === 'cram' ? shuffled(cards, random) : [
    ...interleave(cards.filter(c => c.state.reviewCount > 0)),
    ...interleave(cards.filter(c => c.state.reviewCount === 0)),
  ];
  const seen = new Set<string>(); let newCards = 0;
  return ordered.filter(card => { if (seen.has(card.id)) return false; seen.add(card.id); if (mode === 'due' && card.state.reviewCount === 0 && ++newCards > 10) return false; return true; }).slice(0, limit);
}
function interleave(cards: ReviewCard[]) {
  const decks = new Map<string, ReviewCard[]>();
  for (const card of cards) { const queue = decks.get(card.deckName) ?? []; queue.push(card); decks.set(card.deckName, queue); }
  const result: ReviewCard[] = [];
  while ([...decks.values()].some(queue => queue.length)) for (const queue of decks.values()) { const card = queue.shift(); if (card) result.push(card); }
  return result;
}
export function localDayBounds(now: Date) { const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); return { start: start.toISOString(), end: end.toISOString() }; }
