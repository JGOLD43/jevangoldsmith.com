const INTERNAL_SITE_HOSTS = new Set([
  'jevangoldsmith.com',
  'www.jevangoldsmith.com',
]);

const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:']);

export function isInternalSiteUrl(value: string): boolean {
  if (value === 'about:blank') return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && INTERNAL_SITE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Only main-document URLs get a freshness key; hashed JS, fonts and images
// keep their normal caches so publishing does not slow down every asset.
export function freshSiteUrl(value: string, revision: string | number): string {
  const url = new URL(value, 'https://jevangoldsmith.com/');
  if (!isInternalSiteUrl(url.href) || url.protocol !== 'https:') throw new Error('Invalid website address.');
  url.searchParams.set('jg_refresh', String(revision));
  return url.href;
}

export function publicationPageUrl(type: string, publicId: string | null): string {
  const pages: Record<string, string> = { now: 'now', essay: 'essays', adventure: 'adventures', project: 'projects', challenge: 'challenges', product: 'products', quote: 'quotes', book: 'books' };
  const page = pages[type] || 'index';
  const hash = type !== 'now' && publicId ? `#${encodeURIComponent(publicId)}` : '';
  return `https://jevangoldsmith.com/${page}.html${hash}`;
}
