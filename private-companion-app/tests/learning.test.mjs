import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAttempt, assertAcyclic, buildSessionPlan, prerequisitesMet, priorityScore } from '../src/learning/engine.ts';
import { FRENCH_MILESTONES, FRENCH_SKILLS, FRENCH_SKILL_STAGES } from '../src/learning/french-seed.ts';

const empty = (skillId) => ({ skillId, status: 'ready', strength: 0, cleanRetrievals: 0, helpedRetrievals: 0, misses: 0, nextReviewAt: null, lastAttemptAt: null });

test('French prerequisite graph is valid and acyclic', () => {
  assert.equal(assertAcyclic(FRENCH_SKILLS), true);
  const ids = new Set(FRENCH_SKILLS.map((skill) => skill.id));
  for (const skill of FRENCH_SKILLS) for (const prerequisite of skill.prerequisites) assert.equal(ids.has(prerequisite), true);
});

test('visual skill tree contains every ability once and orders prerequisites first', () => {
  const positioned = new Map();
  for (const [stageIndex, stage] of FRENCH_SKILL_STAGES.entries()) {
    for (const skillId of stage.skillIds) {
      assert.equal(positioned.has(skillId), false, `${skillId} appears more than once`);
      positioned.set(skillId, stageIndex);
    }
  }
  assert.deepEqual(new Set(positioned.keys()), new Set(FRENCH_SKILLS.map((skill) => skill.id)));
  for (const skill of FRENCH_SKILLS) {
    for (const prerequisite of skill.prerequisites) assert.ok(positioned.get(prerequisite) < positioned.get(skill.id), `${prerequisite} must appear before ${skill.id}`);
  }
});

test('prerequisites require reliable evidence', () => {
  const skill = FRENCH_SKILLS.find((item) => item.id === 'slower');
  assert.ok(skill);
  assert.equal(prerequisitesMet(skill, new Map([['repeat', { ...empty('repeat'), status: 'learning' }]])), false);
  assert.equal(prerequisitesMet(skill, new Map([['repeat', { ...empty('repeat'), status: 'reliable' }]])), true);
});

test('three clean spaced retrievals make a skill reliable', () => {
  let state = empty('greet');
  state = applyAttempt(state, 'clean', new Date('2026-08-01T00:00:00Z'));
  state = applyAttempt(state, 'clean', new Date('2026-08-02T00:00:00Z'));
  state = applyAttempt(state, 'clean', new Date('2026-08-05T00:00:00Z'));
  assert.equal(state.status, 'reliable');
  assert.equal(state.strength, 60);
  assert.equal(state.nextReviewAt, '2026-08-12T00:00:00.000Z');
});

test('misses become urgent and do not manufacture mastery', () => {
  const now = new Date('2026-08-25T00:00:00Z');
  const skill = FRENCH_SKILLS.find((item) => item.id === 'greet');
  assert.ok(skill);
  const missed = applyAttempt({ ...empty('greet'), strength: 30 }, 'missed', now);
  assert.equal(missed.status, 'learning');
  assert.equal(missed.strength, 22);
  assert.ok(priorityScore(skill, missed, new Date('2026-08-27T00:00:00Z')) > priorityScore(skill, { ...missed, strength: 90 }, new Date('2026-08-27T00:00:00Z')));
});

test('session contract contains only selected French training material', () => {
  const plan = buildSessionPlan(FRENCH_SKILLS, FRENCH_SKILLS.map((skill) => empty(skill.id)), 20, new Date('2026-08-25T00:00:00Z'));
  assert.equal(plan.durationMinutes, 20);
  assert.ok(plan.exercises.length >= 4);
  assert.match(plan.voiceBrief, /20 minutes/);
  assert.match(plan.voiceBrief, /Target phrases/);
  assert.doesNotMatch(plan.voiceBrief, /vault|finance|photo/i);
});

test('milestones are observable real-life interactions', () => {
  assert.ok(FRENCH_MILESTONES.length >= 6);
  for (const milestone of FRENCH_MILESTONES) {
    assert.ok(milestone.targetMinutes > 0);
    assert.ok(milestone.requiredSkillIds.length >= 3);
    assert.ok(milestone.realLifeTest.length > 45);
    assert.match(milestone.realLifeTest, /introduce|order|ask|hold|tell|explain/i);
  }
});
