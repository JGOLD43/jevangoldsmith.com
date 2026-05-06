// Stable schema.org Person + WebSite descriptors for the whole site. Used by
// the JsonLd component and any per-page overrides. Mirrors the values in the
// legacy tests/seo-fixture.json so external scrapers and rich-result tools
// see no behavioral diff.

import pagesData from '../../../data/pages.json';
import topicsData from '../../../data/topics.json';
import quotesData from '../../../data/quotes.json';
import productsData from '../../../data/products.json';
import projectsData from '../../../data/projects.json';

const SITE_URL = 'https://jevangoldsmith.com';

export const SITE_NAME = 'Jevan Goldsmith';
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

interface PageMeta {
  path?: string;
  audience?: string;
  topics?: string[];
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  lastReviewed?: string;
  schemaType?: string;
  relatedPages?: string[];
}

interface TopicMeta {
  id: string;
  label?: string;
}

const PAGE_META_BY_FILE = new Map<string, PageMeta>(
  (pagesData as PageMeta[]).filter((p) => p.path).map((p) => [p.path!, p])
);

const TOPIC_LABEL_BY_ID = new Map<string, string>(
  ((topicsData as { topics?: TopicMeta[] }).topics ?? []).map((t) => [t.id, t.label ?? t.id])
);

const PAGE_TITLE_BY_FILE = new Map<string, string>(
  (pagesData as Array<PageMeta & { title?: string }>).filter((p) => p.path && p.title).map((p) => [p.path!, p.title!])
);

interface PageEnrichment {
  dateModified?: string;
  keywords?: string[];
  audience?: { '@type': 'Audience'; audienceType: string };
  about?: string[];
  mainEntity?: {
    '@type': 'ItemList';
    itemListElement: Array<{ '@type': 'ListItem'; position: number; url: string; name: string }>;
  };
}

type SchemaListItem = {
  '@type': 'ListItem';
  position: number;
  url?: string;
  name: string;
};

export type ArticleSchema = {
  '@type': 'Article';
  '@id'?: string;
  headline?: string;
  name?: string;
  description?: string;
  image?: string;
};

export type BookSchema = {
  '@type': 'Book';
  '@id'?: string;
  name: string;
  author?: string | { '@type': 'Person'; name: string };
  image?: string;
  description?: string;
  isbn?: string;
};

export type MovieSchema = {
  '@type': 'Movie';
  '@id'?: string;
  name: string;
  image?: string;
  description?: string;
  datePublished?: string | number;
};

export type PersonSchema = {
  '@type': 'Person';
  '@id'?: string;
  name: string;
  jobTitle?: string | null;
  description?: string | null;
  image?: string;
};

export type TouristTripSchema = {
  '@type': 'TouristTrip';
  '@id'?: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  itinerary?: { '@type': 'ItemList'; itemListElement: SchemaListItem[] };
  image?: string;
  provider?: { '@id': string };
};

export type ItemListSchema = {
  '@type': 'ItemList';
  '@id'?: string;
  itemListElement: SchemaListItem[];
};

export type ExtraSchema = ArticleSchema | BookSchema | MovieSchema | PersonSchema | TouristTripSchema | ItemListSchema;

/**
 * Mirrors scripts/legacy-build/build/page-metadata.js: reads data/pages.json
 * + data/topics.json and returns the extra @graph fields the legacy build
 * adds to each pageNode (about / audience / dateModified / keywords /
 * mainEntity). currentPage is e.g. "problems.html".
 */
export function pageEnrichment(currentPage: string): PageEnrichment {
  const meta = PAGE_META_BY_FILE.get(currentPage);
  if (!meta) return {};
  const out: PageEnrichment = {};

  if (meta.lastReviewed) out.dateModified = meta.lastReviewed;

  const keywords = [meta.primaryKeyword, ...(meta.secondaryKeywords ?? [])].filter(Boolean) as string[];
  if (keywords.length > 0) out.keywords = keywords;

  if (meta.audience) {
    out.audience = { '@type': 'Audience', audienceType: meta.audience };
  }

  if (meta.topics && meta.topics.length > 0) {
    out.about = meta.topics.map((id) => TOPIC_LABEL_BY_ID.get(id) ?? id);
  }

  // CollectionPage gets a mainEntity ItemList sourced from per-page logic
  // mirroring the legacy collectionItemsForSchema() branches.
  if (meta.schemaType === 'CollectionPage') {
    const items = collectionItemsFor(currentPage, meta);
    if (items.length > 0) {
      out.mainEntity = {
        '@type': 'ItemList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem' as const,
          position: i + 1,
          url: item.url,
          name: item.name
        }))
      };
    }
  }

  return out;
}

interface CollectionItem {
  url: string;
  name: string;
}

function collectionItemsFor(currentPage: string, meta: PageMeta): CollectionItem[] {
  // Specific collection branches from legacy collectionItemsForSchema().
  if (currentPage === 'quotes.html') {
    const quotes = ((quotesData as { fullQuotes?: Array<{ id: string; slug?: string; text: string }> }).fullQuotes ?? []).slice(0, 20);
    return quotes.map((q) => ({
      url: `${SITE_URL}/quotes.html#${q.slug ?? q.id}`,
      name: q.text.slice(0, 80)
    }));
  }
  if (currentPage === 'products.html') {
    const products = ((productsData as { products?: Array<{ id: string; slug?: string; title: string }> }).products ?? []);
    return products.map((p) => ({
      url: `${SITE_URL}/products.html#${p.slug ?? p.id}`,
      name: p.title
    }));
  }
  if (currentPage === 'free-resources.html') {
    const resources = ((productsData as { resources?: Array<{ id: string; slug?: string; title: string }> }).resources ?? []);
    return resources.map((r) => ({
      url: `${SITE_URL}/free-resources.html#${r.slug ?? r.id}`,
      name: r.title
    }));
  }
  if (currentPage === 'projects.html') {
    const projects = ((projectsData as { projects?: Array<{ id: string; slug?: string; title: string; status?: string; visibility?: string }> }).projects ?? [])
      .filter((p) => p.status !== 'draft' && p.visibility !== 'private');
    return projects.map((p) => ({
      url: `${SITE_URL}/projects.html#${p.slug ?? p.id}`,
      name: p.title
    }));
  }
  // Default: relatedPages from data/pages.json (matches legacy default branch).
  if (meta.relatedPages && meta.relatedPages.length > 0) {
    return meta.relatedPages.slice(0, 12).map((href) => ({
      url: `${SITE_URL}/${href.replace(/^\//, '')}`,
      name: PAGE_TITLE_BY_FILE.get(href) ?? href
    }));
  }
  return [];
}

export function pageNode({
  type,
  canonical,
  title,
  description,
  image,
  enrichment
}: {
  type: PageType;
  canonical: string;
  title: string;
  description: string;
  image?: string;
  enrichment?: PageEnrichment;
}) {
  const base: Record<string, unknown> = {
    '@id': `${canonical}#page`,
    '@type': type,
    url: canonical,
    name: title,
    headline: title,
    description,
    image: {
      '@type': 'ImageObject',
      url: image ?? DEFAULT_OG_IMAGE,
      contentUrl: image ?? DEFAULT_OG_IMAGE,
      caption: title,
      width: 1200,
      height: 630
    },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    author: { '@id': `${SITE_URL}/#person` },
    publisher: { '@id': `${SITE_URL}/#person` },
    inLanguage: 'en'
  };
  if (enrichment?.dateModified) base.dateModified = enrichment.dateModified;
  if (enrichment?.keywords) base.keywords = enrichment.keywords;
  if (enrichment?.audience) base.audience = enrichment.audience;
  if (enrichment?.about) base.about = enrichment.about;
  base.breadcrumb = { '@id': `${canonical}#breadcrumbs` };
  if (enrichment?.mainEntity) base.mainEntity = enrichment.mainEntity;
  return base;
}

// Entity-specific schema builders. Returned objects are added to the @graph
// alongside the page node and breadcrumbs so rich-result tools see typed data.

export function personSchema(opts: {
  canonical: string;
  name: string;
  jobTitle?: string | null;
  description?: string | null;
  image?: string;
}): PersonSchema {
  return {
    '@id': `${opts.canonical}#subject`,
    '@type': 'Person',
    name: opts.name,
    jobTitle: opts.jobTitle ?? undefined,
    description: opts.description ?? undefined,
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
}): TouristTripSchema {
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
