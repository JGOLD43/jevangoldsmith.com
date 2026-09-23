import archive from '../../../data/learning-archive.json';
import additions from '../../../data/library-additions.json';
import corrections from '../../../data/library-material-corrections.json';
import collectionData from '../../../data/library-collections.json';
import guideData from '../../../data/library-guides.json';
import { materialLabels, type ArchiveItem, type MaterialKind } from './library-materials';

// Server-only: resolve stable material IDs at build time, with the same source
// corrections used by the shelf. No guide or classification payload goes to JS.
const corrected = corrections as Record<string, Partial<ArchiveItem>>;
const materials = new Map<string, ArchiveItem>([...archive.items, ...additions].map((item) =>
  [item.id, { ...item, ...corrected[item.id] }]));
export const guideNote = guideData.editorialNote;
export const guideGroups = [...new Set(collectionData.collections.map(({ group }) => group))];
export const shelfHref = (collectionId: string, itemId?: string) => {
  const params = new URLSearchParams({ view: 'library', libraryType: 'archive', librarySort: 'collection', libraryCollection: collectionId });
  if (itemId) params.set('libraryBook', itemId);
  return `/books.html?${params}`;
};
export const guides = guideData.guides.map((guide) => {
  const collection = collectionData.collections.find(({ id }) => id === guide.collectionId);
  if (!collection) throw new Error(`Unknown guide collection: ${guide.collectionId}`);
  return {
    ...guide, collection, href: `/guides/${guide.collectionId}.html`,
    shelfHref: shelfHref(guide.collectionId),
    itemCount: Object.values(collectionData.items).filter(({ collections }) => collections.includes(guide.collectionId)).length,
    steps: guide.steps.map((step) => {
      const material = materials.get(step.itemId);
      if (!material) throw new Error(`Unknown guide material: ${step.itemId}`);
      return { ...step, material,
        format: materialLabels[material.kind as MaterialKind],
        action: material.medium === 'Video' || material.kind === 'documentary' ? 'Watch' : 'Read / explore',
        shelfHref: shelfHref(guide.collectionId, step.itemId),
        attribution: material.attribution || { label: 'Collected by', name: archive.source.curator, url: archive.source.url },
      };
    }),
  };
});
