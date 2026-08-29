import assert from 'node:assert/strict';
import test from 'node:test';

import { applySkillAttempt, emptySkillProgress, skillNodeDepth, skillNodeStatus, validatePrerequisites } from '../src/learning/skill-tree-engine.ts';
import { CORE_SKILL_TREE_SEEDS } from '../src/learning/core-skill-seeds.ts';
import { FOCUSED_SKILL_TREE_SEEDS } from '../src/learning/focused-skill-seeds.ts';

const node = (id, prerequisites = []) => ({ id, treeId: 'tree', title: id, description: '', practicePrompt: '', successCriteria: '', prerequisites, createdAt: '', updatedAt: '' });

test('custom skill trees order branches after every prerequisite', () => {
  const nodes = [node('foundation'), node('branch-a', ['foundation']), node('branch-b', ['foundation']), node('advanced', ['branch-a', 'branch-b'])];
  const byId = new Map(nodes.map((item) => [item.id, item]));
  assert.equal(skillNodeDepth('foundation', byId), 0);
  assert.equal(skillNodeDepth('advanced', byId), 2);
});

test('focused curricula cover dozens of disciplines and hundreds of observable abilities', () => {
  assert.equal(FOCUSED_SKILL_TREE_SEEDS.length, 31);
  assert.ok(FOCUSED_SKILL_TREE_SEEDS.reduce((sum, tree) => sum + tree.nodes.length, 0) >= 217);
  const allTrees = [...CORE_SKILL_TREE_SEEDS, ...FOCUSED_SKILL_TREE_SEEDS];
  assert.equal(new Set(allTrees.map((tree) => tree.key)).size, allTrees.length);
  assert.equal(new Set(allTrees.map((tree) => tree.title.toLocaleLowerCase())).size, allTrees.length);
  for (const curriculum of FOCUSED_SKILL_TREE_SEEDS) {
    const keys = new Set(curriculum.nodes.map((item) => item.key));
    assert.equal(keys.size, curriculum.nodes.length, `${curriculum.title} has duplicate node keys`);
    const nodes = curriculum.nodes.map((item) => node(item.key, item.prerequisiteKeys));
    const byId = new Map(nodes.map((item) => [item.id, item]));
    for (const item of nodes) {
      assert.ok(item.prerequisites.every((id) => keys.has(id)), `${curriculum.title} has a missing prerequisite`);
      assert.doesNotThrow(() => skillNodeDepth(item.id, byId), `${curriculum.title} contains a cycle`);
    }
  }
});

test('custom skill trees reject cycles and missing prerequisites', () => {
  const nodes = [node('one', ['two']), node('two')];
  assert.throws(() => validatePrerequisites('two', ['one'], nodes), /depend on itself/);
  assert.throws(() => validatePrerequisites('three', ['missing'], nodes), /no longer exists/);
});

test('an ability unlocks only when every prerequisite is reliable', () => {
  const skill = node('advanced', ['one', 'two']);
  const reliable = { ...emptySkillProgress('one'), cleanAttempts: 3, strength: 60 };
  const progress = new Map([['one', reliable], ['two', emptySkillProgress('two')]]);
  assert.equal(skillNodeStatus(skill, emptySkillProgress('advanced'), progress), 'locked');
  progress.set('two', { ...reliable, nodeId: 'two' });
  assert.equal(skillNodeStatus(skill, emptySkillProgress('advanced'), progress), 'ready');
});

test('practice evidence progresses from ready to reliable and mastered', () => {
  const skill = node('one');
  let progress = emptySkillProgress('one');
  for (let index = 0; index < 3; index += 1) progress = applySkillAttempt(progress, 'clean', `2026-08-2${index}T00:00:00.000Z`);
  assert.equal(skillNodeStatus(skill, progress, new Map()), 'reliable');
  for (let index = 0; index < 5; index += 1) progress = applySkillAttempt(progress, 'clean', `2026-08-3${index}T00:00:00.000Z`);
  assert.equal(skillNodeStatus(skill, progress, new Map()), 'mastered');
});

test('core curricula are complete, uniquely keyed prerequisite graphs', () => {
  assert.equal(CORE_SKILL_TREE_SEEDS.length, 7);
  assert.ok(CORE_SKILL_TREE_SEEDS.every((tree) => tree.nodes.length >= 8));
  assert.equal(new Set(CORE_SKILL_TREE_SEEDS.map((tree) => tree.key)).size, CORE_SKILL_TREE_SEEDS.length);
  for (const tree of CORE_SKILL_TREE_SEEDS) {
    const keys = new Set(tree.nodes.map((item) => item.key));
    assert.equal(keys.size, tree.nodes.length, `${tree.title} has duplicate node keys`);
    const nodes = tree.nodes.map((item) => node(item.key, item.prerequisiteKeys));
    const byId = new Map(nodes.map((item) => [item.id, item]));
    for (const item of nodes) {
      assert.ok(item.prerequisites.every((id) => keys.has(id)), `${tree.title} has a missing prerequisite`);
      assert.doesNotThrow(() => skillNodeDepth(item.id, byId), `${tree.title} contains a cycle`);
    }
  }
});
