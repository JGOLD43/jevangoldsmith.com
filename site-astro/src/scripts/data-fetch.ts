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

// Soft variant: returns fallback on network/parse failure instead of throwing.
// Used by the adventures map so one 404 doesn't bail the whole render.
export async function fetchJsonOr<T = unknown>(url: string, fallback: T | null = null): Promise<T | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return fallback;
        return await response.json();
    } catch (_error) {
        return fallback;
    }
}

// Read a build-time-inlined JSON payload from a <script type="application/json">
// tag. Returns null if the tag is missing, empty, or malformed.
//
// Used by collection pages that SSR their data as inline JSON to skip the
// post-FCP network round-trip. Fall through to fetchJson when the inline
// path returns null.
export function readInlineJson<T = unknown>(elementId: string): T | null {
    const node = document.getElementById(elementId);
    if (!node || !node.textContent) return null;
    try {
        return JSON.parse(node.textContent) as T;
    } catch {
        return null;
    }
}
