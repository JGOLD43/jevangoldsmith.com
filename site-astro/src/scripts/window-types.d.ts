// Phase 4 slice 4.3 (Tier 1+2 plan): ambient types for the window-mounted
// namespaces that the legacy script files set + read. Quiet the
// ts(2568) hints from `astro check` without TS-converting every file.

declare global {
  interface Window {
    // Adventures pile (set by site-astro/src/scripts/adventures.js +
    // adventures-map.js).
    AdventuresMap?: {
      ensureWorldMap: (adventures: unknown) => Promise<unknown> | unknown;
      highlightAdventureOnMap?: (adventure: unknown) => unknown;
      clearMapHighlight?: () => unknown;
    };
    AdventuresState?: Record<string, unknown>;
    AdventuresUrls?: Record<string, string>;
    AdventuresConstants?: Record<string, unknown>;

    // Sanitize helpers exposed for legacy bare-identifier reads.
    escapeHTML?: (s: unknown) => string;
    escapeAttr?: (s: unknown) => string;
    sanitizeUrl?: (s: unknown, fallback?: string) => string;
    sanitizeHTML?: (s: string) => string;

    // Per-page state surfaces (additive Phase 4 of the prior plan).
    AdventuresState?: Record<string, unknown>;
    BooksState?: Record<string, unknown>;
    MoviesState?: Record<string, unknown>;
    PeopleState?: Record<string, unknown>;
    PodcastsState?: Record<string, unknown>;
    EssaysState?: Record<string, unknown>;
    MovieStats?: { render: (movies: unknown) => void; compute: (movies: unknown) => unknown };

    // Legacy JG namespaces (still referenced by some consumers).
    JGActions?: { register: (handlers: unknown) => unknown };
    JGAnalytics?: { track: (name: string, details?: unknown) => unknown };
    JGCollectionUI?: Record<string, unknown>;
    JGCollectionRuntime?: { create: (config: unknown) => unknown };
    JGCollectionHelpers?: Record<string, unknown>;
    JGDataFetch?: { fetchJson: (url: string, opts?: unknown) => Promise<unknown>; fetchJsonWithFallback: (urls: string[], opts?: unknown) => Promise<unknown>; versionedUrl: (url: string) => Promise<string> };
    JGGridZoom?: { init: (config: unknown) => unknown; release: (grid: unknown) => unknown };
    JGTaskList?: { create: (config: unknown) => unknown };

    // Plausible (analytics).
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;

    // Analytics endpoint hint (set on home pages for routing).
    JG_ANALYTICS_ENDPOINT?: string;
  }
}

export {};
