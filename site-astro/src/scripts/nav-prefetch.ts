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

    // Browsers WITH Speculation Rules use the static <script
    // type="speculationrules"> block emitted by Base.astro (kept static so the
    // CSP can hash it). Nothing to do here for them.
    if (supportsSpeculation) return;

    // Fallback for non-supporting browsers (older Firefox, current Safari):
    // warm the HTTP cache with <link rel="prefetch"> on hover/touchstart.
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
