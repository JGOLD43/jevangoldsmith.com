import * as Crypto from 'expo-crypto';

import { localDayBounds, selectReviewCards, validateCard, type CardInput } from '@/learning/flashcards';
import { emptyCardState, scheduleCardReview } from '@/learning/card-scheduler';
import { FRENCH_SKILLS, FRENCH_SKILL_STAGES } from '@/learning/french-seed';
import type { CardDashboard, LearningCard, LearningCardDirection, LearningCardState, ReviewCard } from '@/learning/types';

import { getDatabase } from './database';

type CardRow = { id: string; skill_id: string | null; deck_name: string; front: string; back: string; note: string; tags_json: string; reverse_enabled: number; archived: number; source: LearningCard['source']; book_id?: string | null; source_label?: string; prompt_kind?: LearningCard['promptKind'] };
type CardStateRow = { card_id: string; direction: LearningCardDirection; stability: number; difficulty: number; due_at: string; interval_days: number; review_count: number; lapse_count: number; last_reviewed_at: string | null };

function mapCard(row: CardRow): LearningCard {
  return { id: row.id, skillId: row.skill_id, deckName: row.deck_name, front: row.front, back: row.back, note: row.note, tags: JSON.parse(row.tags_json) as string[], reverseEnabled: row.reverse_enabled === 1, archived: row.archived === 1, source: row.source, bookId: row.book_id ?? null, sourceLabel: row.source_label ?? '', promptKind: row.prompt_kind ?? 'recall' };
}

function mapState(row: CardStateRow): LearningCardState {
  return { cardId: row.card_id, direction: row.direction, stability: row.stability, difficulty: row.difficulty, dueAt: row.due_at, intervalDays: row.interval_days, reviewCount: row.review_count, lapseCount: row.lapse_count, lastReviewedAt: row.last_reviewed_at };
}

export async function seedFrenchCards(): Promise<void> {
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
  const rows = await (await getDatabase()).getAllAsync<CardRow>(`SELECT * FROM learning_cards ${includeArchived ? '' : 'WHERE archived=0'} ORDER BY deck_name, front`);
  return rows.map(mapCard);
}

export async function getCardDashboard(): Promise<CardDashboard> {
  const database = await getDatabase(); const now = new Date().toISOString(); const today = localDayBounds(new Date(now));
  const cards = await database.getAllAsync<{ deck_name: string; card_id: string; review_count: number; due_at: string }>(`SELECT c.deck_name, s.card_id, s.review_count, s.due_at FROM learning_cards c JOIN learning_card_states s ON s.card_id=c.id WHERE c.archived=0 AND (s.direction='forward' OR c.reverse_enabled=1)`);
  const reviewStats = await database.getFirstAsync<{ total: number; remembered: number }>('SELECT COUNT(*) total, COALESCE(SUM(remembered), 0) remembered FROM learning_card_reviews WHERE created_at>=? AND created_at<?', today.start, today.end);
  const decks = new Map<string, { total: Set<string>; due: number }>();
  for (const row of cards) { const deck = decks.get(row.deck_name) ?? { total: new Set(), due: 0 }; deck.total.add(row.card_id); if (row.review_count > 0 && row.due_at <= now) deck.due += 1; decks.set(row.deck_name, deck); }
  const learned = new Set(cards.filter((row) => row.review_count > 0).map((row) => row.card_id)).size;
  return { dueCount: cards.filter((row) => row.review_count > 0 && row.due_at <= now).length, newCount: new Set(cards.filter((row) => row.review_count === 0).map((row) => row.card_id)).size, learnedCount: learned, totalCount: new Set(cards.map((row) => row.card_id)).size, reviewedToday: reviewStats?.total ?? 0, retentionPercent: reviewStats?.total ? Math.round((reviewStats.remembered / reviewStats.total) * 100) : 0, deckCounts: [...decks].map(([name, value]) => ({ name, total: value.total.size, due: value.due })) };
}

export async function buildCardReviewQueue(mode: 'due' | 'cram', deckName?: string, limit = 24): Promise<ReviewCard[]> {
  const database = await getDatabase(); const now = new Date().toISOString();
  const rows = await database.getAllAsync<CardRow & CardStateRow>(`SELECT c.*, s.card_id, s.direction, s.stability, s.difficulty, s.due_at, s.interval_days, s.review_count, s.lapse_count, s.last_reviewed_at
    FROM learning_cards c JOIN learning_card_states s ON s.card_id=c.id
    WHERE c.archived=0 AND (s.direction='forward' OR c.reverse_enabled=1) AND (? IS NULL OR c.deck_name=?)
    ${mode === 'due' ? 'AND (s.due_at <= ? OR s.review_count=0)' : ''}
    ORDER BY CASE WHEN s.review_count=0 THEN 1 ELSE 0 END, s.due_at`, deckName ?? null, deckName ?? null, ...(mode === 'due' ? [now] : []));
  return selectReviewCards(rows.map((row) => { const card = mapCard(row); const state = mapState(row); return { ...card, direction: row.direction, prompt: row.direction === 'forward' ? card.front : card.back, answer: row.direction === 'forward' ? card.back : card.front, state }; }), mode, limit);
}

export async function reviewLearningCard(card: ReviewCard, remembered: boolean, responseMs: number): Promise<LearningCardState> {
  const database = await getDatabase(); const now = new Date(); let next: LearningCardState;
  await database.withTransactionAsync(async () => {
    const current = await database.getFirstAsync<CardStateRow>('SELECT s.* FROM learning_card_states s JOIN learning_cards c ON c.id=s.card_id WHERE s.card_id=? AND s.direction=? AND c.archived=0', card.id, card.direction);
    if (!current) throw new Error('This card was removed or archived. Start a fresh review.');
    const state = mapState(current);
    next = scheduleCardReview(state, remembered, now);
    await database.runAsync(`UPDATE learning_card_states SET stability=?, difficulty=?, due_at=?, interval_days=?, review_count=?, lapse_count=?, last_reviewed_at=? WHERE card_id=? AND direction=?`, next.stability, next.difficulty, next.dueAt, next.intervalDays, next.reviewCount, next.lapseCount, next.lastReviewedAt, next.cardId, next.direction);
    await database.runAsync(`INSERT INTO learning_card_reviews (id, card_id, direction, remembered, response_ms, previous_interval_days, next_interval_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, Crypto.randomUUID(), card.id, card.direction, remembered ? 1 : 0, Math.max(0, Math.round(responseMs)), state.intervalDays, next.intervalDays, now.toISOString());
  });
  return next!;
}

export async function createLearningCard(input: CardInput): Promise<LearningCard> {
  const value = validateCard(input); const database = await getDatabase(); const now = new Date().toISOString(); const id = Crypto.randomUUID();
  await database.withTransactionAsync(async () => {
    await database.runAsync(`INSERT INTO learning_cards (id, skill_id, deck_name, front, back, note, tags_json, reverse_enabled, archived, source, created_at, updated_at, book_id, source_label, prompt_kind) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, 'personal', ?, ?, ?, ?, ?)`, id, value.deckName, value.front, value.back, value.note, JSON.stringify(value.tags), value.reverseEnabled ? 1 : 0, now, now, value.bookId, value.sourceLabel, value.promptKind);
    for (const direction of ['forward', 'reverse'] as const) {
      const state = emptyCardState(id, direction);
      await database.runAsync(`INSERT INTO learning_card_states (card_id, direction, stability, difficulty, due_at, interval_days, review_count, lapse_count) VALUES (?, ?, ?, ?, ?, 0, 0, 0)`, id, direction, state.stability, state.difficulty, state.dueAt);
    }
  });
  return { ...value, id, skillId: null, archived: false, source: 'personal' };
}

export async function updateLearningCard(id: string, input: CardInput) {
  const value = validateCard(input); const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const previous = await database.getFirstAsync<CardRow>('SELECT * FROM learning_cards WHERE id=?', id);
    if (!previous) throw new Error('This card no longer exists.');
    await database.runAsync('UPDATE learning_cards SET deck_name=?, front=?, back=?, note=?, tags_json=?, reverse_enabled=?, book_id=?, source_label=?, prompt_kind=?, updated_at=? WHERE id=?', value.deckName, value.front, value.back, value.note, JSON.stringify(value.tags), value.reverseEnabled ? 1 : 0, value.bookId, value.sourceLabel, value.promptKind, new Date().toISOString(), id);
    // Changed answers are new learning, not evidence that the replacement is known.
    if (previous.front !== value.front || previous.back !== value.back) await database.runAsync('UPDATE learning_card_states SET stability=0, difficulty=5, due_at=?, interval_days=0, review_count=0, lapse_count=0, last_reviewed_at=NULL WHERE card_id=?', new Date().toISOString(), id);
  });
}

export async function deleteLearningCard(id: string) { await (await getDatabase()).runAsync('DELETE FROM learning_cards WHERE id=?', id); }

export async function setLearningCardArchived(cardId: string, archived: boolean): Promise<void> {
  await (await getDatabase()).runAsync('UPDATE learning_cards SET archived=?, updated_at=? WHERE id=?', archived ? 1 : 0, new Date().toISOString(), cardId);
}
