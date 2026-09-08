import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { localDayBounds, selectReviewCards, shuffled, validateCard } from '../src/learning/flashcards.ts';
import { emptyCardState, scheduleCardReview } from '../src/learning/card-scheduler.ts';
import { UPSKILLING_SEED_NODES } from '../src/learning/upskilling-seed.ts';
process.env.TZ = 'Australia/Brisbane';
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', ...Object.keys(dependencies), js)(exports, ...Object.values(dependencies));
  return exports;
}
function database() {
  const sql = new DatabaseSync(':memory:'); sql.exec('PRAGMA foreign_keys=ON');
  const api = { execAsync: async text => sql.exec(text), runAsync: async (text, ...args) => sql.prepare(text).run(...args), getFirstAsync: async (text, ...args) => sql.prepare(text).get(...args), getAllAsync: async (text, ...args) => sql.prepare(text).all(...args), withTransactionAsync: async fn => { sql.exec('BEGIN'); try { await fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; } } };
  return { sql, api };
}
const repository = api => load('../src/storage/learning-cards-repository.ts', { Crypto: { randomUUID }, emptyCardState, scheduleCardReview, localDayBounds, selectReviewCards, validateCard, getDatabase: async () => api });
const migrations = load('../src/storage/learning-migrations.ts');
const row = (id, deck, reviewed = 1) => ({ id, deckName: deck, direction: 'forward', state: { reviewCount: reviewed } });

test('card input requires useful content and is topic-neutral by default', () => {
  assert.throws(() => validateCard({ deckName: ' ', front: 'Q', back: 'A' }));
  assert.throws(() => validateCard({ deckName: 'Topic', front: '', back: 'A' }));
  const value = validateCard({ deckName: ' Habits ', front: ' Q ', back: ' A ', tags: ['one', ' one ', ''] });
  assert.equal(value.deckName, 'Habits'); assert.equal(value.reverseEnabled, false); assert.deepEqual(value.tags, ['one']);
});
test('mixed review interleaves topics, prioritises reviews and avoids answer leakage', () => {
  const cards = [row('a', 'A'), row('b', 'A'), row('c', 'B'), { ...row('a', 'A'), direction: 'reverse' }, row('new', 'C', 0)];
  assert.deepEqual(selectReviewCards(cards, 'due').map(c => c.id), ['a', 'c', 'b', 'new']);
});
test('shuffle samples the whole deck without mutating or losing cards', () => {
  const cards = Array.from({ length: 150 }, (_, i) => row(String(i), 'Topic'));
  const before = JSON.stringify(cards), mixed = selectReviewCards(cards, 'cram', 100, () => 0.99999);
  assert.equal(mixed.length, 100); assert.equal(JSON.stringify(cards), before);
  const reversed = shuffled(cards, () => 0); assert.equal(new Set(reversed.map(c => c.id)).size, 150); assert.equal(reversed.at(-1).id, '0');
  assert.ok(selectReviewCards(cards, 'cram', 100, () => 0).some(c => c.id === '100'));
});
test('forgotten cards return soon and remembered cards gain spacing', () => {
  const now = new Date('2026-09-08T00:00:00Z'), initial = emptyCardState('one', 'forward', now);
  const first = scheduleCardReview(initial, true, now), second = scheduleCardReview(first, true, new Date(+now + 86400000)), missed = scheduleCardReview(second, false, now);
  assert.equal(first.intervalDays, 1); assert.ok(second.intervalDays > 1); assert.equal(+new Date(missed.dueAt) - +now, 600000); assert.equal(missed.lapseCount, 1);
});
test('review-day boundaries use phone local time', () => {
  assert.deepEqual(localDayBounds(new Date('2026-09-08T01:00:00+10:00')), { start: '2026-09-07T14:00:00.000Z', end: '2026-09-08T14:00:00.000Z' });
});
test('flashcard columns migrate even when the old skill-tree migration is already complete', async () => {
  const { sql, api } = database();
  const source = readFileSync(new URL('../src/storage/learning-migrations.ts', import.meta.url), 'utf8');
  sql.exec(source.match(/database\.execAsync\(`([\s\S]*?)`\)/)[1]);
  sql.exec("INSERT INTO schema_migrations VALUES ('skill-trees-v2', 'old'); INSERT INTO learning_cards (id,deck_name,front,back,created_at,updated_at) VALUES ('existing','Old','Q','A','old','old');");
  await migrations.runLearningMigrations(api); await migrations.runLearningMigrations(api);
  assert.equal(sql.prepare('SELECT book_id,source_label,prompt_kind FROM learning_cards WHERE id=?').get('existing').prompt_kind, 'recall');
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM learning_cards').get().n, 1); sql.close();
});
test('create, edit, schedule, archive and delete use real SQLite and preserve source context', async () => {
  const { sql, api } = database(); await migrations.runLearningMigrations(api); const repo = repository(api);
  assert.deepEqual(await repo.listLearningCards(), []);
  const card = await repo.createLearningCard({ deckName: 'Decisions', front: 'Why?', back: 'Because', note: 'Private excerpt', bookId: 'book-one', sourceLabel: 'A book', promptKind: 'explain' });
  assert.equal((await repo.listLearningCards())[0].bookId, 'book-one');
  const queue = await repo.buildCardReviewQueue('due'); assert.equal(queue.length, 1); assert.equal(queue[0].direction, 'forward');
  await repo.reviewLearningCard(queue[0], true, 3000);
  assert.equal((await repo.getCardDashboard()).reviewedToday, 1); assert.equal((await repo.buildCardReviewQueue('due')).length, 0);
  const prior = sql.prepare('SELECT * FROM learning_card_states WHERE card_id=?').all(card.id);
  await repo.buildCardReviewQueue('cram'); assert.deepEqual(sql.prepare('SELECT * FROM learning_card_states WHERE card_id=?').all(card.id), prior);
  await repo.updateLearningCard(card.id, { ...card, back: 'A corrected answer' });
  assert.equal((await repo.buildCardReviewQueue('due'))[0].state.reviewCount, 0);
  await repo.setLearningCardArchived(card.id, true); assert.equal((await repo.buildCardReviewQueue('cram')).length, 0);
  await assert.rejects(repo.reviewLearningCard(queue[0], true, 3000));
  await repo.setLearningCardArchived(card.id, false); assert.equal((await repo.listLearningCards()).length, 1);
  await repo.deleteLearningCard(card.id); assert.equal(sql.prepare('SELECT COUNT(*) n FROM learning_card_reviews').get().n, 0); assert.equal(sql.prepare('SELECT COUNT(*) n FROM learning_card_states').get().n, 0); sql.close();
});
test('upskilling starter deck is opt-in and repeated import preserves edited cards', async () => {
  const { sql, api } = database(); await migrations.runLearningMigrations(api);
  const starters = load('../src/storage/flashcard-starters.ts', { UPSKILLING_SEED_NODES, getDatabase: async () => api });
  await starters.addUpskillingFlashcards(); const count = sql.prepare('SELECT COUNT(*) n FROM learning_cards').get().n;
  sql.exec("UPDATE learning_cards SET back='My answer' WHERE id='upskilling-card-define-performance'");
  await starters.addUpskillingFlashcards(); assert.equal(sql.prepare('SELECT COUNT(*) n FROM learning_cards').get().n, count);
  assert.equal(sql.prepare("SELECT back FROM learning_cards WHERE id='upskilling-card-define-performance'").get().back, 'My answer'); sql.close();
});
