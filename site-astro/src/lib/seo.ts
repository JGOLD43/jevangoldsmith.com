// Stable schema.org Person + WebSite descriptors for the whole site. Used by
// the JsonLd component and any per-page overrides. Mirrors the values in the
// legacy tests/seo-fixture.json so external scrapers and rich-result tools
// see no behavioral diff.

const SITE_URL = 'https://jevangoldsmith.com';

export const SITE_NAME = 'Jevan Goldsmith';
export const SITE_URL_CANONICAL = `${SITE_URL}/`;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/generated/logo/logo-nav-176.png`;

export const PERSON_SCHEMA = {
  '@id': `${SITE_URL}/#person`,
  '@type': 'Person',
  name: 'Jevan Goldsmith',
  url: `${SITE_URL}/`,
  email: 'hello@jevangoldsmith.com',
  jobTitle: 'Writer and builder',
  description: 'Jevan Goldsmith writes about better thinking, books, AI-assisted work, personal systems, real estate development, business building, travel, and useful tools.',
  image: `${SITE_URL}/images/generated/profile/profile-720.jpg`,
  knowsAbout: [
    'better thinking',
    'books and reading',
    'AI-assisted work',
    'personal systems',
    'real estate development',
    'business building'
  ],
  sameAs: [
    'https://x.com/JevanGoldsmith',
    'https://youtube.com/@JevanGoldsmith',
    'https://instagram.com/jevangoldsmith',
    'https://linkedin.com/in/jevan-goldsmith-7b885a185',
    'https://letterboxd.com/contentwatch'
  ]
} as const;

export const WEBSITE_SCHEMA = {
  '@id': `${SITE_URL}/#website`,
  '@type': 'WebSite',
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  inLanguage: 'en',
  publisher: { '@id': `${SITE_URL}/#person` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search.html?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
} as const;

export interface BreadcrumbStep {
  name: string;
  url: string;
}

export function breadcrumbList(canonical: string, steps: BreadcrumbStep[]) {
  return {
    '@id': `${canonical}#breadcrumbs`,
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: step.url
    }))
  };
}

export type PageType = 'WebPage' | 'AboutPage' | 'CollectionPage' | 'ContactPage' | 'ProfilePage' | 'Article' | 'WebSite';

export function pageNode({
  type,
  canonical,
  title,
  description,
  image
}: {
  type: PageType;
  canonical: string;
  title: string;
  description: string;
  image?: string;
}) {
  return {
    '@id': `${canonical}#page`,
    '@type': type,
    url: canonical,
    name: title,
    headline: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    author: { '@id': `${SITE_URL}/#person` },
    publisher: { '@id': `${SITE_URL}/#person` },
    breadcrumb: { '@id': `${canonical}#breadcrumbs` },
    image: {
      '@type': 'ImageObject',
      url: image ?? DEFAULT_OG_IMAGE,
      contentUrl: image ?? DEFAULT_OG_IMAGE,
      caption: title,
      width: 1200,
      height: 630
    }
  };
}

// Entity-specific schema builders. Returned objects are added to the @graph
// alongside the page node and breadcrumbs so rich-result tools see typed data.

export function articleSchema(opts: {
  canonical: string;
  headline: string;
  description?: string;
  datePublished?: string | null;
  dateModified?: string | null;
  image?: string;
  category?: string | null;
}) {
  return {
    '@id': `${opts.canonical}#article`,
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description ?? '',
    image: opts.image ?? DEFAULT_OG_IMAGE,
    datePublished: opts.datePublished ?? undefined,
    dateModified: opts.dateModified ?? opts.datePublished ?? undefined,
    articleSection: opts.category ?? undefined,
    author: { '@id': `${SITE_URL}/#person` },
    publisher: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: { '@id': `${opts.canonical}#page` }
  };
}

export function bookSchema(opts: {
  canonical: string;
  name: string;
  author: string;
  isbn?: string | null;
  datePublished?: string | number | null;
  image?: string;
  description?: string | null;
}) {
  return {
    '@id': `${opts.canonical}#book`,
    '@type': 'Book',
    name: opts.name,
    author: { '@type': 'Person', name: opts.author },
    isbn: opts.isbn ?? undefined,
    datePublished: opts.datePublished != null ? String(opts.datePublished) : undefined,
    image: opts.image,
    description: opts.description ?? undefined
  };
}

export function movieSchema(opts: {
  canonical: string;
  name: string;
  datePublished?: string | number | null;
  image?: string;
  description?: string | null;
  genre?: string[] | string | null;
}) {
  return {
    '@id': `${opts.canonical}#movie`,
    '@type': 'Movie',
    name: opts.name,
    datePublished: opts.datePublished != null ? String(opts.datePublished) : undefined,
    image: opts.image,
    description: opts.description ?? undefined,
    genre: opts.genre ?? undefined
  };
}

export function personSchema(opts: {
  canonical: string;
  name: string;
  jobTitle?: string | null;
  description?: string | null;
  image?: string;
}) {
  return {
    '@id': `${opts.canonical}#subject`,
    '@type': 'Person',
    name: opts.name,
    jobTitle: opts.jobTitle ?? undefined,
    description: opts.description ?? undefined,
    image: opts.image
  };
}

export function placeSchema(opts: {
  canonical: string;
  name: string;
  address?: string | null;
  image?: string;
}) {
  return {
    '@id': `${opts.canonical}#place`,
    '@type': 'Place',
    name: opts.name,
    address: opts.address ?? undefined,
    image: opts.image
  };
}

export function tripSchema(opts: {
  canonical: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  itinerary?: Array<{ name: string }> | null;
  image?: string;
}) {
  return {
    '@id': `${opts.canonical}#trip`,
    '@type': 'TouristTrip',
    name: opts.name,
    description: opts.description ?? undefined,
    startDate: opts.startDate ?? undefined,
    endDate: opts.endDate ?? undefined,
    itinerary: opts.itinerary && opts.itinerary.length > 0
      ? { '@type': 'ItemList', itemListElement: opts.itinerary.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name })) }
      : undefined,
    image: opts.image,
    provider: { '@id': `${SITE_URL}/#person` }
  };
}

export function collectionPageItemList(opts: {
  canonical: string;
  items: Array<{ name: string; url?: string }>;
}) {
  return {
    '@id': `${opts.canonical}#itemlist`,
    '@type': 'ItemList',
    numberOfItems: opts.items.length,
    itemListElement: opts.items.slice(0, 25).map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url
    }))
  };
}
