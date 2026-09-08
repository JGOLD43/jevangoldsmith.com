import { UPSKILLING_SEED_NODES } from '@/learning/upskilling-seed';
import { getDatabase } from './database';

export async function addUpskillingFlashcards() {
  const db = await getDatabase(), now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const item of UPSKILLING_SEED_NODES) {
      const id = `upskilling-card-${item.key}`;
      await db.runAsync(`INSERT OR IGNORE INTO learning_cards (id, deck_name, front, back, note, tags_json, reverse_enabled, archived, source, created_at, updated_at, source_label, prompt_kind) VALUES (?, 'Learning how to learn', ?, ?, ?, '["upskilling","practice"]', 0, 0, 'personal', ?, ?, ?, 'apply')`, id, item.practicePrompt, item.successCriteria, item.description, now, now, 'Original practice prompts inspired by Justin Skycak’s Advice on Upskilling');
      await db.runAsync(`INSERT OR IGNORE INTO learning_card_states (card_id, direction, stability, difficulty, due_at, interval_days, review_count, lapse_count) VALUES (?, 'forward', 0, 5, ?, 0, 0, 0)`, id, now);
      await db.runAsync(`INSERT OR IGNORE INTO learning_card_states (card_id, direction, stability, difficulty, due_at, interval_days, review_count, lapse_count) VALUES (?, 'reverse', 0, 5, ?, 0, 0, 0)`, id, now);
    }
  });
}
