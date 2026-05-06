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

export async function fetchJsonWithFallback(urls: string[], options: { cache?: RequestCache } = {}) {
    let lastError: unknown = null;
    for (const url of urls) {
        try {
            return await fetchJson(url, options);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('Failed to load JSON');
}
