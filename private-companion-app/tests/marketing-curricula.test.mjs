import assert from 'node:assert/strict';
import test from 'node:test';
import { MARKETING_CURRICULA, MARKETING_RESOURCES, MARKETING_PREPARATION, MARKETING_TREE_ORDER } from '../src/learning/marketing-curricula.ts';
import { PRIORITY_CURRICULA } from '../src/learning/priority-curricula.ts';
import { CORE_SKILL_TREE_SEEDS } from '../src/learning/core-skill-seeds.ts';
import { FOCUSED_SKILL_TREE_SEEDS } from '../src/learning/focused-skill-seeds.ts';
import { layoutSkillTree } from '../src/learning/skill-tree-layout.ts';

test('marketing curricula are additive, reachable and include assessed transfer', () => {
  const existing = new Set([...PRIORITY_CURRICULA, ...CORE_SKILL_TREE_SEEDS, ...FOCUSED_SKILL_TREE_SEEDS].map(t => t.title.toLowerCase()));
  assert.equal(MARKETING_CURRICULA.length, 17);
  const titles = new Set();
  for (const tree of MARKETING_CURRICULA) {
    assert.ok(!existing.has(tree.title.toLowerCase()), `would merge unrelated existing tree: ${tree.title}`);
    assert.ok(!titles.has(tree.title)); titles.add(tree.title);
    const seen = new Set(), ancestors = new Map();
    assert.ok(tree.nodes.length >= 7);
    for (const node of tree.nodes) {
      assert.ok(!seen.has(node.key));
      const reachable = new Set();
      for (const key of node.prerequisiteKeys) {
        assert.ok(seen.has(key), `${tree.title}/${node.key}: missing or forward prerequisite ${key}`);
        reachable.add(key);
        for (const ancestor of ancestors.get(key)) reachable.add(ancestor);
      }
      ancestors.set(node.key, reachable); seen.add(node.key);
      assert.match(node.practicePrompt, /Next repetition:/);
      assert.match(node.successCriteria, /independently/);
    }
    assert.equal(tree.nodes.at(-1).key, 'capstone');
    assert.equal(tree.nodes.at(-1).dimension, 'transfer');
    assert.equal(ancestors.get('capstone').size, tree.nodes.length - 1, `${tree.title}: capstone skips a branch`);
    assert.ok(MARKETING_RESOURCES[tree.title]?.length);
    for (const resource of MARKETING_RESOURCES[tree.title]) {
      assert.equal(new URL(resource.url).protocol, 'https:');
      assert.ok(resource.when.length > 40);
    }
  }
});

test('marketing discovery order and preparation links resolve to available trees', () => {
  const all = new Set([...MARKETING_CURRICULA, ...PRIORITY_CURRICULA].map(t => t.title));
  assert.equal(MARKETING_TREE_ORDER[0], 'Marketing foundations');
  assert.equal(new Set(MARKETING_TREE_ORDER).size, MARKETING_TREE_ORDER.length);
  for (const title of MARKETING_TREE_ORDER) assert.ok(all.has(title), title);
  for (const [title, required] of Object.entries(MARKETING_PREPARATION)) {
    assert.ok(all.has(title));
    for (const parent of required) {
      assert.ok(all.has(parent));
      assert.ok(MARKETING_TREE_ORDER.indexOf(parent) < MARKETING_TREE_ORDER.indexOf(title), `${title}: preparation must precede it`);
    }
  }
});

test('all marketing branches lay out on narrow phones and with large text', () => {
  for (const tree of MARKETING_CURRICULA) {
    const depth = new Map();
    const nodes = tree.nodes.map(node => {
      const level = node.prerequisiteKeys.length ? 1 + Math.max(...node.prerequisiteKeys.map(key => depth.get(key))) : 0;
      depth.set(node.key, level);
      return { ...node, id: node.key, depth: level, prerequisites: node.prerequisiteKeys };
    });
    for (const width of [280, 353]) for (const scale of [1, 2]) {
      const layout = layoutSkillTree(nodes, width, scale);
      assert.equal(layout.positions.length, nodes.length);
      assert.equal(layout.connections.length, nodes.reduce((n, node) => n + node.prerequisites.length, 0));
    }
  }
});

test('worked experimental example has the stated uncertainty', () => {
  const p0 = 200 / 2000, p1 = 240 / 2000;
  const margin = 1.96 * Math.sqrt(p0 * (1-p0) / 2000 + p1 * (1-p1) / 2000);
  assert.ok(Math.abs((p1-p0-margin)*100 - 0.06) < 0.01);
  assert.ok(Math.abs((p1-p0+margin)*100 - 3.94) < 0.01);
});
