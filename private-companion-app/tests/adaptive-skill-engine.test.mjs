import assert from 'node:assert/strict';
import test from 'node:test';

import { adaptivePriority, applyAdaptiveEvidence, chooseNextSkill, emptyDimensionScores, estimateRetention } from '../src/learning/adaptive-skill-engine.ts';

const progress = (overrides = {}) => ({ nodeId: 'skill', strength: 0, cleanAttempts: 0, helpedAttempts: 0, misses: 0, lastPracticedAt: null, stabilityDays: 0, difficulty: 5, dueAt: null, retentionEstimate: 0, dimensionScores: emptyDimensionScores(), ...overrides });
const node = (id, status, progressOverrides = {}) => ({ id, treeId: 'tree', title: id, description: '', practicePrompt: '', successCriteria: '', prerequisites: [], dimension: 'procedural', sourceReferences: [], inferenceConfidence: 1, createdAt: '', updatedAt: '', depth: 0, status, progress: progress({ nodeId: id, ...progressOverrides }) });

test('retention estimate decays with elapsed time and never claims direct measurement', () => {
  const state = progress({ stabilityDays: 10, lastPracticedAt: '2026-08-01T00:00:00.000Z' });
  assert.equal(Math.round(estimateRetention(state, new Date('2026-08-01T00:00:00.000Z')) * 100), 100);
  assert.equal(Math.round(estimateRetention(state, new Date('2026-08-11T00:00:00.000Z')) * 100), 37);
});

test('delayed clean retrieval expands stability and records the evidence angle', () => {
  const state = progress({ strength: 42, stabilityDays: 4, lastPracticedAt: '2026-08-01T00:00:00.000Z' });
  const next = applyAdaptiveEvidence(state, { result: 'clean', dimension: 'conceptual', responseMs: 14_000, hintCount: 0, transferContext: false, practicedAt: '2026-08-06T00:00:00.000Z' });
  assert.ok(next.stabilityDays > state.stabilityDays);
  assert.ok(next.dimensionScores.conceptual > 0);
  assert.equal(next.dimensionScores.procedural, 0);
  assert.match(next.dueAt, /^2026-08-/);
});

test('misses shorten stability and hints do not receive independent credit', () => {
  const missed = applyAdaptiveEvidence(progress({ strength: 60, stabilityDays: 12, lastPracticedAt: '2026-08-01T00:00:00.000Z' }), { result: 'missed', dimension: 'procedural', responseMs: 40_000, hintCount: 2, transferContext: false, practicedAt: '2026-08-08T00:00:00.000Z' });
  assert.ok(missed.stabilityDays < 12);
  assert.ok(missed.strength < 60);
  const helped = applyAdaptiveEvidence(progress(), { result: 'helped', dimension: 'procedural', responseMs: 20_000, hintCount: 2, transferContext: false, practicedAt: '2026-08-08T00:00:00.000Z' });
  assert.equal(helped.dimensionScores.procedural, 0);
});

test('the selector stays at the frontier and prioritises weak due abilities', () => {
  const at = new Date('2026-08-20T00:00:00.000Z');
  const locked = node('locked', 'locked');
  const retained = node('retained', 'reliable', { stabilityDays: 100, lastPracticedAt: '2026-08-19T00:00:00.000Z', dueAt: '2026-09-20T00:00:00.000Z' });
  const due = node('due', 'practising', { stabilityDays: 3, lastPracticedAt: '2026-08-10T00:00:00.000Z', dueAt: '2026-08-13T00:00:00.000Z' });
  assert.equal(chooseNextSkill([locked, retained, due], at)?.id, 'due');
  assert.ok(adaptivePriority(due, at) > adaptivePriority(retained, at));
});
