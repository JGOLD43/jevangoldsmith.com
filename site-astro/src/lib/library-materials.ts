import { videoArtwork, type VideoArtwork } from './video-artwork';

export const materialLabels = {
  book: 'Books', article: 'Articles', art: 'Art', video: 'Videos', interview: 'Interviews',
  documentary: 'Documentaries', memo: 'Memos', other: 'Other material',
} as const;
export type MaterialKind = keyof typeof materialLabels;
export type MaterialFilter = MaterialKind | 'all' | 'archive';
export const parseMaterialFilter = (value: string | null): MaterialFilter =>
  value === 'all' || value === 'archive' || (value && Object.hasOwn(materialLabels, value)) ? value as MaterialFilter : 'book';

export interface ArchiveItem {
  id: string;
  title: string;
  url: string;
  kind: string;
  topic: string;
  medium: string;
  duration: string | null;
  author?: string;
  attribution?: { label: string; name: string; url: string };
}

export interface ProblemCollection {
  id: string;
  label: string;
  description: string;
  group: string;
  starters: string[];
  readingOrder?: string[];
  guideHref?: string;
}

export interface LibraryClassification {
  collections: string[];
  role: string;
  why: string;
  evidence: { basis: string; url: string };
  provisional: boolean;
}

export interface ArtArtwork {
  image: string;
  frame: string;
}

export function archiveVolume(item: ArchiveItem, classification?: LibraryClassification, artwork?: VideoArtwork, artArtwork?: ArtArtwork) {
  const kind = item.kind as Exclude<MaterialKind, 'book'>;
  const palettes = { article: '#eadfc8', art: '#976549', video: '#2a494a', interview: '#a95138',
    documentary: '#7e8781', memo: '#c3a26b', other: '#82875f' };
  const video = kind === 'video' ? videoArtwork(item, artwork) : undefined;
  return {
    id: item.id, title: item.title, author: item.author || new URL(item.url).hostname.replace(/^www\./, ''),
    href: item.url, cover: '', kind, ratio: kind === 'interview' ? 1.55 : kind === 'art' || kind === 'documentary' ? 1 : .72,
    tier: '', tierLabel: materialLabels[kind], tierColor: '#e3d8c6', collection: item.topic,
    binding: video
      ? { background: video.background, ink: video.ink, accent: video.accent, serif: video.font === 'serif' }
      : { background: palettes[kind], ink: '#251e17', accent: '#251e17', serif: true },
    videoArtwork: video,
    artArtwork: kind === 'art' ? artArtwork : undefined,
    highlightCount: null, duration: item.duration, medium: item.medium,
    attribution: item.attribution, classification,
  };
}
