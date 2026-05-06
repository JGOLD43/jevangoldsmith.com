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
        const rules = {
            prerender: [{
                where: {
                    and: [
                        { href_matches: '/*.html' },
                        { not: { href_matches: '/data-smoke.html' } },
                        { not: { href_matches: '/meet.html' } }
                    ]
                },
                eagerness
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
        if (anchor.origin !== location.origin) return;
        if (anchor.href === location.href) return;
        if (!navigator.onLine) return;
        prefetch(anchor.href);
    };
    addEventListener('mouseover', onHover, { passive: true });
    addEventListener('touchstart', onHover, { passive: true });
})();

export {};
