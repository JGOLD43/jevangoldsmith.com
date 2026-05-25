// Nav prefetch / prerender bootstrap.
//
// Browsers with Speculation Rules support: register a moderate-eagerness
// prerender block for same-origin .html links so hover/touchstart navigation
// swaps in a fully-rendered hidden tab. Eagerness drops to "conservative"
// when the user has saveData enabled (cellular/metered).
//
// Browsers without Speculation Rules (older Firefox, current Safari): fall
// back to <link rel="prefetch"> on hover/touchstart for same-origin links.
//
// Theme guard stays inline in Base.astro to avoid dark-mode flash before
// first paint — externalizing it would defeat the FOUC fix.

(() => {
    const supportsSpeculation = typeof HTMLScriptElement !== 'undefined'
        && typeof HTMLScriptElement.supports === 'function'
        && HTMLScriptElement.supports('speculationrules');

    if (supportsSpeculation) {
        const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        const saveData = conn?.saveData === true;
        const eagerness = saveData ? 'conservative' : 'moderate';
        // Heavy pages downgrade from `prerender` to `prefetch`. Prerender
        // pulls the full DOM + scripts (Leaflet on adventures, search
        // index on /search), which wastes bandwidth on a hover that may
        // never become a click. Prefetch only warms the HTTP cache.
        const rules = {
            prerender: [{
                // Light pages — prerender on hover/moderate intent so a hover
                // navigation is effectively instant.
                where: {
                    and: [
                        { href_matches: '/*.html' },
                        { not: { href_matches: '/data-smoke.html' } },
                        { not: { href_matches: '/meet.html' } },
                        { not: { href_matches: '/adventures.html' } },
                        { not: { href_matches: '/search.html' } },
                        { not: { href_matches: '/adventure-*.html' } }
                    ]
                },
                eagerness
            }, {
                // Adventures is heavy (Leaflet) but the user opens it often
                // enough that the previous-page flash is the bigger UX cost.
                // Prerender it conservatively — fires on touchstart/mousedown
                // so we don't pay the cost on stray hovers but still beat the
                // browser to the punch on a real tap.
                where: { href_matches: '/adventures.html' },
                eagerness: 'conservative'
            }],
            prefetch: [{
                // /adventure-<slug>.html is now a 0ms HTML redirect to
                // /adventures.html?trip=<slug>; no point prefetching the
                // stub itself. Keep search prefetched for quick autocomplete.
                where: { href_matches: '/search.html' },
                eagerness: saveData ? 'conservative' : 'moderate'
            }]
        };
        const script = document.createElement('script');
        script.type = 'speculationrules';
        script.textContent = JSON.stringify(rules);
        document.head.appendChild(script);
        return;
    }

    // Fallback for non-supporting browsers.
    const seen = new Set<string>();
    const prefetch = (href: string) => {
        if (seen.has(href)) return;
        seen.add(href);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
    };
    const onHover = (event: Event) => {
        const target = event.target as Element | null;
        const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!anchor) return;
        // Skip non-HTTP schemes (mailto:, tel:, javascript:, blob:, etc.).
        if (anchor.protocol !== 'http:' && anchor.protocol !== 'https:') return;
        if (anchor.origin !== location.origin) return;
        if (anchor.href === location.href) return;
        // Same-page fragment anchor — no point prefetching the page that's
        // already loaded.
        if (anchor.pathname === location.pathname && anchor.hash) return;
        if (!navigator.onLine) return;
        prefetch(anchor.href);
    };
    addEventListener('mouseover', onHover, { passive: true });
    addEventListener('touchstart', onHover, { passive: true });
})();

export {};
