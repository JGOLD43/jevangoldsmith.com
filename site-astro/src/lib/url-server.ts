// SSR-safe URL sanitizer (mirror of safe-url.ts but no `window`
// reference). Used during astro build where the browser global isn't
// available. Same allow-list semantics: relative paths, http(s)/mailto/tel.
export function sanitizeUrl(url: unknown, fallback = '#'): string {
    const raw = String(url || '').trim();
    if (!raw) return fallback;
    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
    try {
        const parsed = new URL(raw);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') return raw;
    } catch {
        return fallback;
    }
    return fallback;
}
