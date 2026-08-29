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
