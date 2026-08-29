import * as Crypto from 'expo-crypto';

import { emptyCardState, scheduleCardReview } from '@/learning/card-scheduler';
import { FRENCH_SKILLS, FRENCH_SKILL_STAGES } from '@/learning/french-seed';
import type { CardDashboard, LearningCard, LearningCardDirection, LearningCardState, ReviewCard } from '@/learning/types';

import { getDatabase } from './database';

type CardRow = { id: string; skill_id: string | null; deck_name: string; front: string; back: string; note: string; tags_json: string; reverse_enabled: number; archived: number; source: LearningCard['source'] };
type CardStateRow = { card_id: string; direction: LearningCardDirection; stability: number; difficulty: number; due_at: string; interval_days: number; review_count: number; lapse_count: number; last_reviewed_at: string | null };

function mapCard(row: CardRow): LearningCard {
  return { id: row.id, skillId: row.skill_id, deckName: row.deck_name, front: row.front, back: row.back, note: row.note, tags: JSON.parse(row.tags_json) as string[], reverseEnabled: row.reverse_enabled === 1, archived: row.archived === 1, source: row.source };
}

function mapState(row: CardStateRow): LearningCardState {
  return { cardId: row.card_id, direction: row.direction, stability: row.stability, difficulty: row.difficulty, dueAt: row.due_at, intervalDays: row.interval_days, reviewCount: row.review_count, lapseCount: row.lapse_count, lastReviewedAt: row.last_reviewed_at };
}

async function seedFrenchCards(): Promise<void> {
  const database = await getDatabase(); const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    for (const skill of FRENCH_SKILLS) {
      const stage = FRENCH_SKILL_STAGES.find((item) => item.skillIds.includes(skill.id));
      const meanings = skill.meaning.split(' / ');
      for (const [index, phrase] of skill.phrases.entries()) {
        const id = `fr-${skill.id}-${index}`; const front = meanings[index] ?? `${skill.ability} (${index + 1})`;
        await database.runAsync(`INSERT OR IGNORE INTO learning_cards
          (id, skill_id, deck_name, front, back, note, tags_json, reverse_enabled, archived, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'curriculum', ?, ?)`, id, skill.id, stage?.title ?? 'French foundations', front, phrase, skill.ability, JSON.stringify(['french', skill.kind, stage?.level ?? 'A1']), now, now);
        await database.runAsync(`INSERT OR IGNORE INTO learning_card_states
          (card_id, direction, stability, difficulty, due_at, interval_days, review_count, lapse_count) VALUES (?, 'forward', 0, 5, ?, 0, 0, 0)`, id, now);
        await database.runAsync(`INSERT OR IGNORE INTO learning_card_states
          (card_id, direction, stability, difficulty, due_at, interval_days, review_count, lapse_count) VALUES (?, 'reverse', 0, 5, ?, 0, 0, 0)`, id, now);
      }
    }
  });
}

export async function listLearningCards(includeArchived = false): Promise<LearningCard[]> {
  await seedFrenchCards();
  const rows = await (await getDatabase()).getAllAsync<CardRow>(`SELECT * FROM learning_cards ${includeArchived ? '' : 'WHERE archived=0'} ORDER BY deck_name, front`);
  return rows.map(mapCard);
}

export async function getCardDashboard(): Promise<CardDashboard> {
  await seedFrenchCards(); const database = await getDatabase(); const now = new Date().toISOString(); const today = now.slice(0, 10);
  const cards = await database.getAllAsync<{ deck_name: string; card_id: string; review_count: number; due_at: string }>(`SELECT c.deck_name, s.card_id, s.review_count, s.due_at FROM learning_cards c JOIN learning_card_states s ON s.card_id=c.id WHERE c.archived=0 AND (s.direction='forward' OR c.reverse_enabled=1)`);
  const reviewStats = await database.getFirstAsync<{ total: number; remembered: number }>('SELECT COUNT(*) total, COALESCE(SUM(remembered), 0) remembered FROM learning_card_reviews WHERE substr(created_at, 1, 10)=?', today);
  const decks = new Map<string, { total: Set<string>; due: number }>();
  for (const row of cards) { const deck = decks.get(row.deck_name) ?? { total: new Set(), due: 0 }; deck.total.add(row.card_id); if (row.review_count > 0 && row.due_at <= now) deck.due += 1; decks.set(row.deck_name, deck); }
  const learned = new Set(cards.filter((row) => row.review_count > 0).map((row) => row.card_id)).size;
  return { dueCount: cards.filter((row) => row.review_count > 0 && row.due_at <= now).length, newCount: new Set(cards.filter((row) => row.review_count === 0).map((row) => row.card_id)).size, learnedCount: learned, totalCount: new Set(cards.map((row) => row.card_id)).size, reviewedToday: reviewStats?.total ?? 0, retentionPercent: reviewStats?.total ? Math.round((reviewStats.remembered / reviewStats.total) * 100) : 0, deckCounts: [...decks].map(([name, value]) => ({ name, total: value.total.size, due: value.due })) };
}

export async function buildCardReviewQueue(mode: 'due' | 'cram', deckName?: string): Promise<ReviewCard[]> {
  await seedFrenchCards(); const database = await getDatabase(); const now = new Date().toISOString();
  const rows = await database.getAllAsync<CardRow & CardStateRow>(`SELECT c.*, s.card_id, s.direction, s.stability, s.difficulty, s.due_at, s.interval_days, s.review_count, s.lapse_count, s.last_reviewed_at
    FROM learning_cards c JOIN learning_card_states s ON s.card_id=c.id
    WHERE c.archived=0 AND (s.direction='forward' OR c.reverse_enabled=1) AND (? IS NULL OR c.deck_name=?)
    ${mode === 'due' ? 'AND (s.due_at <= ? OR s.review_count=0)' : ''}
    ORDER BY CASE WHEN s.review_count=0 THEN 1 ELSE 0 END, s.due_at LIMIT ?`, deckName ?? null, deckName ?? null, ...(mode === 'due' ? [now] : []), mode === 'due' ? 24 : 100);
  return rows.map((row) => { const card = mapCard(row); const state = mapState(row); return { ...card, direction: row.direction, prompt: row.direction === 'forward' ? card.front : card.back, answer: row.direction === 'forward' ? card.back : card.front, state }; });
}

export async function reviewLearningCard(card: ReviewCard, remembered: boolean, responseMs: number): Promise<LearningCardState> {
  const database = await getDatabase(); const now = new Date(); const next = scheduleCardReview(card.state, remembered, now);
  await database.withTransactionAsync(async () => {
    await database.runAsync(`UPDATE learning_card_states SET stability=?, difficulty=?, due_at=?, interval_days=?, review_count=?, lapse_count=?, last_reviewed_at=? WHERE card_id=? AND direction=?`, next.stability, next.difficulty, next.dueAt, next.intervalDays, next.reviewCount, next.lapseCount, next.lastReviewedAt, next.cardId, next.direction);
    await database.runAsync(`INSERT INTO learning_card_reviews (id, card_id, direction, remembered, response_ms, previous_interval_days, next_interval_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, Crypto.randomUUID(), card.id, card.direction, remembered ? 1 : 0, Math.max(0, Math.round(responseMs)), card.state.intervalDays, next.intervalDays, now.toISOString());
  });
  return next;
}

export async function createLearningCard(input: { deckName: string; front: string; back: string; note?: string; tags?: string[]; reverseEnabled?: boolean }): Promise<LearningCard> {
  const database = await getDatabase(); const now = new Date().toISOString(); const id = Crypto.randomUUID();
  await database.runAsync(`INSERT INTO learning_cards (id, skill_id, deck_name, front, back, note, tags_json, reverse_enabled, archived, source, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, 'personal', ?, ?)`, id, input.deckName.trim() || 'My French', input.front.trim(), input.back.trim(), input.note?.trim() ?? '', JSON.stringify(input.tags ?? ['french']), input.reverseEnabled === false ? 0 : 1, now, now);
  for (const direction of ['forward', 'reverse'] as const) { const state = emptyCardState(id, direction); await database.runAsync(`INSERT INTO learning_card_states (card_id, direction, stability, difficulty, due_at, interval_days, review_count, lapse_count) VALUES (?, ?, ?, ?, ?, 0, 0, 0)`, id, direction, state.stability, state.difficulty, state.dueAt); }
  return { id, skillId: null, deckName: input.deckName.trim() || 'My French', front: input.front.trim(), back: input.back.trim(), note: input.note?.trim() ?? '', tags: input.tags ?? ['french'], reverseEnabled: input.reverseEnabled !== false, archived: false, source: 'personal' };
}

export async function setLearningCardArchived(cardId: string, archived: boolean): Promise<void> {
  await (await getDatabase()).runAsync('UPDATE learning_cards SET archived=?, updated_at=? WHERE id=?', archived ? 1 : 0, new Date().toISOString(), cardId);
}
