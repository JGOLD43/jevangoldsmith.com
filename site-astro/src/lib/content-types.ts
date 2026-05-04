// Shared collection types for Phase 2 of the Native Astro modernization plan.
//
// These types describe the normalized shape that every collection page can
// rely on. They do not replace per-collection schemas; they sit on top of
// them. Pages can consume `NormalizedItem` so card/grid/filter/search code
// stays consistent across collections.
//
// Adding fields here is safe; removing or renaming a field is a breaking
// change that must be coordinated with the consuming pages and validators.

export type PublishStatus =
  | 'published'
  | 'preview'
  | 'draft'
  | 'retired'
  | 'available'
  | 'unknown';

export interface NormalizedItem {
  id: string;
  slug: string;
  title: string;
  url: string | null;
  status: PublishStatus;
  description: string | null;
  image: string | null;
  srcset: string | null;
  searchText: string | null;
  tags: string[];
  category: string | null;
  raw: Record<string, unknown>;
}

export type CollectionName =
  | 'books'
  | 'people'
  | 'movies'
  | 'podcasts'
  | 'products'
  | 'adventures'
  | 'projects'
  | 'challenges';

// Per-collection field map. The validator and normalizers use this to enforce
// required fields for "published" items and to know which fields are real
// runtime concerns vs build-time only.
export interface CollectionContract {
  collection: CollectionName;
  // Fields every published item must have a non-empty value for.
  requiredForPublished: ReadonlyArray<keyof NormalizedItem>;
  // Fields that are still consumed by browser JS at runtime (manifest must
  // not drop them). Empty when the page is fully static.
  runtimeFields: ReadonlyArray<string>;
}

export const COLLECTION_CONTRACTS: Readonly<Record<CollectionName, CollectionContract>> = {
  books: {
    collection: 'books',
    requiredForPublished: ['id', 'title', 'description'],
    runtimeFields: ['title', 'author', 'category', 'shortDescription', 'review', 'rating', 'reReads', 'year', 'isbn']
  },
  people: {
    collection: 'people',
    requiredForPublished: ['id', 'title', 'image'],
    runtimeFields: ['name', 'title', 'lesson', 'category', 'image', 'srcset', 'searchText']
  },
  movies: {
    collection: 'movies',
    requiredForPublished: ['id', 'title'],
    runtimeFields: ['title', 'date', 'rating', 'starCount', 'year', 'poster', 'genre', 'tmdbId', 'overview']
  },
  podcasts: {
    collection: 'podcasts',
    requiredForPublished: ['id', 'title', 'description'],
    runtimeFields: ['title', 'host', 'description', 'category', 'badge', 'image', 'searchText']
  },
  products: {
    collection: 'products',
    requiredForPublished: ['id', 'title'],
    runtimeFields: ['title', 'description', 'category', 'status', 'image']
  },
  adventures: {
    collection: 'adventures',
    requiredForPublished: ['id', 'title', 'image'],
    runtimeFields: ['id', 'title', 'subtitle', 'location', 'region', 'startDate', 'endDate', 'heroImage', 'shortDescription', 'tags']
  },
  projects: {
    collection: 'projects',
    requiredForPublished: ['id', 'title', 'description'],
    runtimeFields: ['title', 'shortDescription', 'description', 'status', 'category', 'tags']
  },
  challenges: {
    collection: 'challenges',
    requiredForPublished: ['id', 'title', 'description'],
    runtimeFields: ['title', 'shortDescription', 'description', 'status', 'category', 'timeframe', 'progress']
  }
};

export type NormalizedItemMap = {
  [K in CollectionName]: NormalizedItem[];
};
