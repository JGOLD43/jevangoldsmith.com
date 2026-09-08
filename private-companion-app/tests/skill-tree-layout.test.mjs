import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutSkillTree } from '../src/learning/skill-tree-layout.ts';
import { skillNodeDepth } from '../src/learning/skill-tree-engine.ts';
import { PRIORITY_CURRICULA } from '../src/learning/priority-curricula.ts';

test('phone graph renders exactly the real prerequisite connections without overlapping nodes', () => {
  for (const seed of PRIORITY_CURRICULA) {
    const raw = seed.nodes.map(node => ({ id: node.key, prerequisites: node.prerequisiteKeys }));
    const byId = new Map(raw.map(node => [node.id, node]));
    const nodes = raw.map(node => ({ ...node, depth: skillNodeDepth(node.id, byId) }));
    for (const width of [280, 320, 353, 600]) {
      for (const scale of [1, 1.5, 2]) {
        const graph = layoutSkillTree(nodes, width, scale);
        assert.equal(graph.positions.length, nodes.length);
        assert.equal(graph.connections.length, nodes.reduce((sum, node) => sum + node.prerequisites.length, 0));
        for (const [i, box] of graph.positions.entries()) {
          assert.ok(box.x >= 0 && box.x + box.width <= width);
          assert.ok(box.y >= 0 && box.y + box.height <= graph.height);
          for (const other of graph.positions.slice(i + 1)) {
            assert.ok(box.x + box.width <= other.x || other.x + other.width <= box.x || box.y + box.height <= other.y || other.y + other.height <= box.y, `${seed.title}: overlapping ${box.id} and ${other.id}`);
          }
        }
        for (const edge of graph.connections) {
          assert.ok(byId.get(edge.to).prerequisites.includes(edge.from));
          assert.ok(edge.points.every(point => point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= graph.height));
        }
      }
    }
  }
});
test('large text collapses branching rows to a single column', () => {
  const nodes = [{ id: 'a', depth: 0, prerequisites: [] }, { id: 'b', depth: 0, prerequisites: [] }];
  const graph = layoutSkillTree(nodes, 353, 1.6);
  assert.equal(graph.columns, 1);
  assert.ok(graph.positions[1].y > graph.positions[0].y);
});
