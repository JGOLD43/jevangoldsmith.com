import { readDocument, writeDocument, legacyDocument, bodyText } from '@/domain/studio-document.cjs';
import type { DraftType, NewPublicDraft, NowLocation } from '@/domain/models';

export const SITE_BASE_URL = 'https://jevangoldsmith.com';

export type SiteCollection = DraftType;

export type SiteItem = {
  id: string;
  type: SiteCollection;
  title: string;
  summary: string;
  body: string;
  editorBody?: string;
  image: string | null;
  meta: string;
  date: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  canonicalUrl: string | null;
  nowLocation?: NowLocation;
};

type ApiCollection = { items?: Record<string, unknown>[] };

const endpoint: Record<SiteCollection, string> = {
  now: 'now',
  challenge: 'challenges',
  essay: 'essays',
  adventure: 'adventures',
  project: 'projects',
  product: 'products',
  quote: 'quotes',
};

export const collectionLabels: Record<SiteCollection, string> = {
  now: 'Now update',
  challenge: 'Challenges',
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
    .replace(/<\/(p|h[1-6]|blockquote)>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
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
  const sourceBody = text(raw.content) || text(raw.description) || text(raw.text);
  const editorBody = readDocument(sourceBody) ? sourceBody : writeDocument(legacyDocument(sourceBody));
  const body = bodyText(editorBody);
  const title = text(raw.title) || text(raw.text);
  const summary = quote
    ? text(raw.summary) || text(raw.author)
    : text(raw.summary) || text(raw.subtitle) || text(raw.shortDescription) || text(raw.description);
  const image = absoluteSiteUrl(raw.featuredImage || raw.heroImage || raw.image);
  const meta = quote
    ? text(raw.category)
    : [text(raw.category), text(raw.location), text(raw.date || raw.startDate), text(raw.brand)]
        .filter(Boolean)
        .join(' • ');

  return {
    nowLocation: raw.nowLocation as NowLocation | undefined,
    id: text(raw.id) || text(raw.slug),
    type,
    title,
    summary,
    body,
    editorBody,
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

export type StudioReceipt = { status: 'accepted' | 'rejected'; publicId: string | null; reason: string; processedAt: string };
export type StudioSnapshot = { version: number; collections: Record<SiteCollection, Record<string, unknown>[]>; receipts: Record<string, StudioReceipt> };

export async function loadStudioSnapshot(): Promise<StudioSnapshot> {
  const response = await fetch(`${SITE_BASE_URL}/api/v1/studio.json?refresh=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Could not refresh Studio (${response.status}). Your saved drafts are safe.`);
  const payload = await response.json() as StudioSnapshot;
  if (payload.version !== 1 || !payload.collections || !payload.receipts) throw new Error('The website returned an invalid Studio response. Try refreshing.');
  return payload;
}

export async function loadSiteCollection(type: SiteCollection): Promise<SiteItem[]> {
  const payload = await loadStudioSnapshot();
  return (payload.collections[type] ?? []).map((item) => normalizeItem(type, item)).filter((item) => item.id && item.title);
}

export type SiteHomeData = {
  adventure: SiteItem | null;
  essay: SiteItem | null;
  project: SiteItem | null;
  collections: Record<SiteCollection, number>;
};

export async function loadSiteHome(): Promise<SiteHomeData> {
  const snapshot = await loadStudioSnapshot();
  const results = editableCollections.map((type) => [type, (snapshot.collections[type] || []).map((item) => normalizeItem(type, item))] as const);
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
    body: item.editorBody || item.body || item.title,
    sourceId: item.id,
    operation: 'update',
    nowLocation: item.nowLocation ?? null,
  };
}
