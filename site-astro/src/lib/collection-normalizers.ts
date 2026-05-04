// Pure normalization helpers for the Phase 2 normalized collection contract.
//
// Each `normalize<X>` takes a raw collection item (already loaded by Astro's
// content config) and returns a `NormalizedItem`. Normalizers must be pure
// and side-effect free — no fs reads, no globals, no mutation of input.
//
// These are additive: pages that have not migrated yet keep using their
// existing per-collection fields. Pages that opt in get a stable, shared
// surface for cards, filters, search, and validation.

import type {
  CollectionName,
  NormalizedItem,
  PublishStatus
} from './content-types';

const TRUTHY_STATUSES: ReadonlySet<PublishStatus> = new Set([
  'published',
  'available'
]);

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v))
    .filter((v): v is string => Boolean(v));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function statusFrom(raw: Record<string, unknown>, fallback: PublishStatus = 'published'): PublishStatus {
  const value = asString(raw.status);
  if (!value) return fallback;
  const lower = value.toLowerCase();
  if (lower === 'published' || lower === 'preview' || lower === 'draft' || lower === 'retired' || lower === 'available') {
    return lower;
  }
  return 'unknown';
}

function joinSearchText(parts: Array<string | null | undefined>): string | null {
  const joined = parts
    .map((p) => (p == null ? '' : String(p)))
    .filter(Boolean)
    .join(' ')
    .trim();
  return joined || null;
}

export function isPublished(item: NormalizedItem): boolean {
  return TRUTHY_STATUSES.has(item.status);
}

export function collectionUrl(item: NormalizedItem): string | null {
  return item.url;
}

export function collectionImage(item: NormalizedItem): string | null {
  return item.image;
}

export function collectionDescription(item: NormalizedItem): string | null {
  return item.description;
}

export function collectionSearchText(item: NormalizedItem): string {
  return item.searchText ?? [item.title, item.description, item.category, ...item.tags].filter(Boolean).join(' ');
}

interface NormalizeOptions {
  // Default status when the source row has no `status` field. Most legacy
  // JSON does not carry a status, so we treat them as published.
  defaultStatus?: PublishStatus;
}

export function normalizeBook(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? asString(raw.isbn) ?? slugify(asString(raw.title) ?? 'book');
  const title = asString(raw.title) ?? '';
  const description = asString(raw.shortDescription) ?? asString(raw.review);
  return {
    id,
    slug: id,
    title,
    url: null,
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description,
    image: null,
    srcset: null,
    searchText: joinSearchText([title, asString(raw.author), asString(raw.category), description]),
    tags: asArray(raw.tags),
    category: asString(raw.category),
    raw
  };
}

export function normalizePerson(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? slugify(asString(raw.name) ?? 'person');
  const title = asString(raw.name) ?? '';
  const description = asString(raw.lesson) ?? asString(raw.title);
  return {
    id,
    slug: id,
    title,
    url: `people/${id}.html`,
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description,
    image: asString(raw.image),
    srcset: asString(raw.srcset),
    searchText: asString(raw.searchText) ?? joinSearchText([title, asString(raw.title), asString(raw.lesson), asString(raw.category)]),
    tags: asArray(raw.tags),
    category: asString(raw.category),
    raw
  };
}

export function normalizeMovie(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? (raw.tmdbId != null ? String(raw.tmdbId) : null) ?? slugify(asString(raw.title) ?? 'movie');
  const title = asString(raw.title) ?? '';
  const description = asString(raw.overview);
  const tags = [...asArray(raw.tmdbGenres), ...(asString(raw.genre) ? [asString(raw.genre) as string] : [])];
  return {
    id,
    slug: id,
    title,
    url: asString(raw.link),
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description,
    image: asString(raw.poster),
    srcset: null,
    searchText: joinSearchText([title, asString(raw.genre), description, ...tags]),
    tags,
    category: asString(raw.genre),
    raw
  };
}

export function normalizePodcast(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? slugify(asString(raw.title) ?? 'podcast');
  const title = asString(raw.title) ?? '';
  return {
    id,
    slug: id,
    title,
    url: null,
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description: asString(raw.description),
    image: asString(raw.image),
    srcset: null,
    searchText: asString(raw.searchText) ?? joinSearchText([title, asString(raw.host), asString(raw.description), asString(raw.category), asString(raw.badge)]),
    tags: asArray(raw.tags),
    category: asString(raw.category),
    raw
  };
}

export function normalizeProduct(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? slugify(asString(raw.title) ?? 'product');
  const title = asString(raw.title) ?? asString(raw.name) ?? '';
  return {
    id,
    slug: id,
    title,
    url: asString(raw.url) ?? asString(raw.link),
    status: statusFrom(raw, opts.defaultStatus ?? 'available'),
    description: asString(raw.description) ?? asString(raw.shortDescription),
    image: asString(raw.image),
    srcset: asString(raw.srcset),
    searchText: joinSearchText([title, asString(raw.description), asString(raw.category)]),
    tags: asArray(raw.tags),
    category: asString(raw.category),
    raw
  };
}

export function normalizeAdventure(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? slugify(asString(raw.title) ?? 'adventure');
  const title = asString(raw.title) ?? '';
  return {
    id,
    slug: asString(raw.slug) ?? id,
    title,
    url: `adventure-${id}.html`,
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description: asString(raw.shortDescription),
    image: asString(raw.heroImage),
    srcset: null,
    searchText: joinSearchText([title, asString(raw.subtitle), asString(raw.location), asString(raw.region), asString(raw.shortDescription), ...asArray(raw.tags)]),
    tags: asArray(raw.tags),
    category: asString(raw.region),
    raw
  };
}

export function normalizeProject(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? slugify(asString(raw.title) ?? 'project');
  const title = asString(raw.title) ?? '';
  return {
    id,
    slug: asString(raw.slug) ?? id,
    title,
    url: null,
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description: asString(raw.shortDescription) ?? asString(raw.description),
    image: asString(raw.image),
    srcset: null,
    searchText: joinSearchText([title, asString(raw.shortDescription), asString(raw.description), asString(raw.category), ...asArray(raw.tags), ...asArray(raw.technologies), ...asArray(raw.topics)]),
    tags: [...asArray(raw.tags), ...asArray(raw.technologies), ...asArray(raw.topics)],
    category: asString(raw.category),
    raw
  };
}

export function normalizeChallenge(raw: Record<string, unknown>, opts: NormalizeOptions = {}): NormalizedItem {
  const id = asString(raw.id) ?? slugify(asString(raw.title) ?? 'challenge');
  const title = asString(raw.title) ?? '';
  return {
    id,
    slug: asString(raw.slug) ?? id,
    title,
    url: null,
    status: statusFrom(raw, opts.defaultStatus ?? 'published'),
    description: asString(raw.shortDescription) ?? asString(raw.description),
    image: null,
    srcset: null,
    searchText: joinSearchText([title, asString(raw.shortDescription), asString(raw.description), asString(raw.category), asString(raw.timeframe), ...asArray(raw.tags), ...asArray(raw.searchTerms)]),
    tags: [...asArray(raw.tags), ...asArray(raw.searchTerms)],
    category: asString(raw.category),
    raw
  };
}

export const NORMALIZERS: Record<CollectionName, (raw: Record<string, unknown>, opts?: NormalizeOptions) => NormalizedItem> = {
  books: normalizeBook,
  people: normalizePerson,
  movies: normalizeMovie,
  podcasts: normalizePodcast,
  products: normalizeProduct,
  adventures: normalizeAdventure,
  projects: normalizeProject,
  challenges: normalizeChallenge
};
