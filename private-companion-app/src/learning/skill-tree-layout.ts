import type { SkillTreeNodeView } from './types';

export type TreePosition = { id: string; x: number; y: number; width: number; height: number };
export type TreeConnection = { from: string; to: string; points: { x: number; y: number }[] };

// A narrow-screen graph: branches share a row, long prerequisite links use side
// rails so they never run through unrelated lesson cards.
export function layoutSkillTree(nodes: Pick<SkillTreeNodeView, 'id' | 'depth' | 'prerequisites'>[], width: number, fontScale = 1) {
  const scale = Math.max(1, fontScale);
  const columns = width < 310 || scale > 1.35 ? 1 : 2;
  const gutter = 18, gap = 14;
  const cardWidth = (width - gutter * 2 - gap * (columns - 1)) / columns;
  const cardHeight = Math.ceil(136 * scale);
  const levels = [...new Set(nodes.map(node => node.depth))].sort((a, b) => a - b);
  const positions: TreePosition[] = [];
  const headings: { depth: number; y: number }[] = [];
  let y = 28;
  for (const depth of levels) {
    headings.push({ depth, y: y - 25 });
    const group = nodes.filter(node => node.depth === depth);
    for (let i = 0; i < group.length; i += columns) {
      const row = group.slice(i, i + columns);
      const rowWidth = row.length * cardWidth + (row.length - 1) * gap;
      row.forEach((node, column) => positions.push({ id: node.id, x: (width - rowWidth) / 2 + column * (cardWidth + gap), y, width: cardWidth, height: cardHeight }));
      y += cardHeight + 24;
    }
    y += 44;
  }
  const byId = new Map(positions.map(position => [position.id, position]));
  const connections: TreeConnection[] = [];
  for (const node of nodes) {
    const target = byId.get(node.id)!;
    for (const prerequisite of node.prerequisites) {
      const source = byId.get(prerequisite);
      if (!source) continue;
      const start = { x: source.x + source.width / 2, y: source.y + source.height };
      const end = { x: target.x + target.width / 2, y: target.y };
      const adjacent = end.y - start.y <= 70;
      const rail = start.x <= width / 2 ? 6 : width - 6;
      const points = adjacent
        ? [start, { x: start.x, y: start.y + 22 }, { x: end.x, y: start.y + 22 }, end]
        : [start, { x: start.x, y: start.y + 10 }, { x: rail, y: start.y + 10 }, { x: rail, y: end.y - 10 }, { x: end.x, y: end.y - 10 }, end];
      connections.push({ from: prerequisite, to: node.id, points });
    }
  }
  return { positions, connections, headings, height: Math.max(0, y - 44), columns };
}
