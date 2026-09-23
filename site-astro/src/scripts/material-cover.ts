import { materialLabels, type MaterialKind } from '../lib/library-materials';

// Original typographic objects, not reproductions of the linked works' artwork.
export function materialCover(material: { title: string; kind: MaterialKind; collection: string; medium?: string; duration?: string | null }) {
  const cover = document.createElement('span');
  cover.className = 'material-design';
  const text = (className: string, value: string) => {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = value;
    cover.append(node);
  };
  text('material-edition', materialLabels[material.kind]);
  const illustration = document.createElement('span');
  illustration.className = 'material-illustration';
  for (let i = 0; i < 3; i++) illustration.append(document.createElement('i'));
  cover.append(illustration);
  text('material-heading', material.title);
  text('material-rule', '');
  text('material-footnote', `${material.collection} · ${material.duration || material.medium || 'Collected material'}`);
  return cover;
}
