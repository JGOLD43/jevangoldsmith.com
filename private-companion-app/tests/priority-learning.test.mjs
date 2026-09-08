import assert from 'node:assert/strict';
import test from 'node:test';
import { PRIORITY_CURRICULA, CURRICULUM_RESOURCES } from '../src/learning/priority-curricula.ts';
import { summarisePractice, validPracticeDuration } from '../src/learning/practice-time.ts';
import { CORE_SKILL_TREE_SEEDS } from '../src/learning/core-skill-seeds.ts';
import { FOCUSED_SKILL_TREE_SEEDS } from '../src/learning/focused-skill-seeds.ts';

test('priority curricula seed in prerequisite order without colliding with existing trees', () => {
  const all = [...CORE_SKILL_TREE_SEEDS, ...FOCUSED_SKILL_TREE_SEEDS, ...PRIORITY_CURRICULA];
  assert.equal(new Set(all.map(tree => tree.title.toLowerCase())).size, all.length);
  assert.equal(new Set(all.map(tree => tree.key)).size, all.length);
  for (const tree of PRIORITY_CURRICULA) {
    const earlier = new Set();
    for (const node of tree.nodes) {
      assert.ok(!earlier.has(node.key));
      assert.ok(node.prerequisiteKeys.every(key => earlier.has(key)), node.title);
      assert.ok(node.practicePrompt.length > 40 && node.successCriteria.length > 40);
      earlier.add(node.key);
    }
    assert.equal(tree.nodes.at(-1).dimension, 'transfer');
    assert.ok(CURRICULUM_RESOURCES[tree.title].length);
  }
});
test('manual practice rejects invalid or unbounded durations', () => {
  for (const input of ['', '0', '-10', 'Infinity', 'NaN', '721', 'abc']) assert.throws(() => validPracticeDuration(input));
  assert.equal(validPracticeDuration('20'), 1_200_000);
  assert.equal(validPracticeDuration('0.5'), 30_000);
});
test('practice totals exclude study and group by local calendar date', () => {
  const at = new Date(2026, 8, 8, 12);
  const log = (kind, minutes, date) => ({ kind, durationMs: minutes * 60_000, createdAt: date.toISOString() });
  const summary = summarisePractice([
    log('practice', 20, new Date(2026, 8, 8, 9)), log('practice', 10, new Date(2026, 8, 8, 10)),
    log('study', 40, new Date(2026, 8, 8, 9)), log('practice', 15, new Date(2026, 8, 2, 0)),
    log('practice', 60, new Date(2026, 8, 1, 23, 59)), log('practice', 999, new Date(2026, 8, 9)),
  ], at);
  assert.equal(summary.todayMs, 30 * 60_000);
  assert.equal(summary.weekMs, 45 * 60_000);
  assert.equal(summary.totalMs, 105 * 60_000);
  assert.equal(summary.studyMs, 40 * 60_000);
  assert.deepEqual(summary.activity.at(-1), { date: '2026-09-08', value: 30, count: 2 });
});

test('practice time migration upgrades existing databases and preserves evidence on rerun', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runLearningMigrations } = await import('../src/storage/learning-migrations.ts');
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const adapter = {
    execAsync: async sql => db.exec(sql),
    runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
    getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args),
    getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
  };
  try {
    await runLearningMigrations(adapter);
    // Simulate an installed v2 database before this feature existed.
    db.exec('DROP TABLE skill_practice_time');
    await runLearningMigrations(adapter);
    db.exec("INSERT INTO skill_trees VALUES ('tree', 'Copywriting', '', '2026-09-08', '2026-09-08')");
    db.exec("INSERT INTO skill_tree_nodes (id, tree_id, title, created_at, updated_at) VALUES ('node', 'tree', 'Brief', '2026-09-08', '2026-09-08')");
    db.exec("INSERT INTO skill_practice_time VALUES ('log', 'tree', 'node', 'practice', 600000, 'Wrote brief', '2026-09-08')");
    await runLearningMigrations(adapter);
    assert.equal(db.prepare('SELECT duration_ms FROM skill_practice_time').get().duration_ms, 600000);
    assert.throws(() => db.exec("INSERT INTO skill_practice_time VALUES ('bad', 'tree', 'node', 'practice', -1, 'Bad', '2026-09-08')"));
    db.exec("DELETE FROM skill_trees WHERE id = 'tree'");
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM skill_practice_time').get().count, 0);
  } finally { db.close(); }
});
