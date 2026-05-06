// Runtime JSON fetch helpers. Cache-busting was previously routed through
// /data/runtime-data-manifest.json, but that file was never generated —
// every fetch paid an extra 404 round-trip. Direct fetch is faster and
// relies on Firebase Hosting's standard Cache-Control on JSON.

export async function fetchJson(url: string, options: { cache?: RequestCache } = {}) {
    const response = await fetch(url, { cache: options.cache ?? 'default' });
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return response.json();
}
