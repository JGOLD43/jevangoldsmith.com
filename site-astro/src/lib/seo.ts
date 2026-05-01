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

export function pageNode({
  type,
  canonical,
  title,
  description,
  image
}: {
  type: 'WebPage' | 'AboutPage' | 'CollectionPage' | 'ContactPage' | 'ProfilePage' | 'Article';
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
