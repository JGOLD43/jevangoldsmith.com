import type { DraftType, NewPublicDraft } from '@/domain/models';

export const SITE_BASE_URL = 'https://jevangoldsmith.com';

export type SiteCollection = Exclude<DraftType, 'challenge' | 'now'>;

export type SiteItem = {
  id: string;
  type: SiteCollection;
  title: string;
  summary: string;
  body: string;
  image: string | null;
  meta: string;
  date: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  canonicalUrl: string | null;
};

type ApiCollection = { items?: Record<string, unknown>[] };

const endpoint: Record<SiteCollection, string> = {
  essay: 'essays',
  adventure: 'adventures',
  project: 'projects',
  product: 'products',
  quote: 'quotes',
};

export const collectionLabels: Record<SiteCollection, string> = {
  essay: 'Essays',
  adventure: 'Trips',
  project: 'Projects',
  product: 'Shelf',
  quote: 'Quotes',
};

export const editableCollections = Object.keys(endpoint) as SiteCollection[];

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function absoluteSiteUrl(value: unknown): string | null {
  const path = text(value);
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_BASE_URL}/${path.replace(/^\//, '')}`;
}

function normalizeItem(type: SiteCollection, raw: Record<string, unknown>): SiteItem {
  const quote = type === 'quote';
  const body = quote ? text(raw.text) : plainText(text(raw.content) || text(raw.description));
  const title = quote ? text(raw.text) : text(raw.title);
  const summary = quote
    ? text(raw.author)
    : text(raw.summary) || text(raw.subtitle) || text(raw.shortDescription) || text(raw.description);
  const image = absoluteSiteUrl(raw.featuredImage || raw.heroImage || raw.image);
  const meta = quote
    ? text(raw.category)
    : [text(raw.category), text(raw.location), text(raw.date || raw.startDate), text(raw.brand)]
        .filter(Boolean)
        .join(' • ');

  return {
    id: text(raw.id) || text(raw.slug),
    type,
    title,
    summary,
    body,
    image,
    meta,
    date: text(raw.date || raw.startDate),
    category: text(raw.category) || 'Unsorted',
    createdAt: text(raw.createdAt) || text(raw.date || raw.startDate),
    updatedAt: text(raw.updatedAt) || text(raw.createdAt) || text(raw.date || raw.startDate),
    status: text(raw.status) || 'published',
    canonicalUrl: absoluteSiteUrl(raw.canonicalUrl),
  };
}

export async function loadSiteCollection(type: SiteCollection): Promise<SiteItem[]> {
  const response = await fetch(`${SITE_BASE_URL}/api/v1/${endpoint[type]}.json`);
  if (!response.ok) throw new Error(`Could not load ${collectionLabels[type]} (${response.status}).`);
  const payload = (await response.json()) as ApiCollection;
  return (payload.items ?? []).map((item) => normalizeItem(type, item)).filter((item) => item.id && item.title);
}

export type SiteHomeData = {
  adventure: SiteItem | null;
  essay: SiteItem | null;
  project: SiteItem | null;
  collections: Record<SiteCollection, number>;
};

export async function loadSiteHome(): Promise<SiteHomeData> {
  const results = await Promise.all(editableCollections.map(async (type) => [type, await loadSiteCollection(type)] as const));
  const byType = Object.fromEntries(results) as Record<SiteCollection, SiteItem[]>;
  const newest = (items: SiteItem[]) => [...items].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  return {
    adventure: newest(byType.adventure),
    essay: newest(byType.essay),
    project: byType.project[0] ?? null,
    collections: Object.fromEntries(results.map(([type, items]) => [type, items.length])) as Record<SiteCollection, number>,
  };
}

export function draftFromSiteItem(item: SiteItem): NewPublicDraft {
  return {
    type: item.type,
    title: item.title,
    summary: item.summary,
    body: item.body || item.title,
    sourceId: item.id,
    operation: 'update',
  };
}
