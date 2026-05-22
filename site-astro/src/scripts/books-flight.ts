import { SESSION_KEYS } from './storage-keys';
import { TIMING } from './timing';
import { BREAKPOINT, HERO_OFFSET_TOP } from './breakpoints';

let restoreBookListFromSpa: (() => boolean) | null = null;

export function initBooksZoom() {
    const booksGrid = document.getElementById('books-container');
    if (!booksGrid) return;
    booksGrid.classList.add('js-zoom-grid');
    booksGrid.querySelectorAll('.book-card').forEach((el) => el.classList.add('js-zoom-item'));
    // Cross-doc view-transitions exist (see @view-transition in
    // legacy-style.css) but in practice they don't always fire visibly
    // across cross-origin caches / Astro's MPA flow, so the cover read
    // as a "flash to position" instead of moving. To make the motion
    // deterministic we run a FLIP animation ourselves: clone the cover,
    // fly it from grid → detail hero, then navigate.
    initBookCoverFlight(booksGrid as HTMLElement);
}

function initBookCoverFlight(grid: HTMLElement) {
    grid.addEventListener('click', (event) => {
        if (event.defaultPrevented) return;
        const targetEl = event.target as Element | null;
        if (!targetEl) return;
        const card = targetEl.closest('a.book-card') as HTMLAnchorElement | null;
        if (!card) return;
        const href = card.getAttribute('href');
        if (!href || href === '#') return;
        const cover = card.querySelector('.book-cover') as HTMLImageElement | null;
        if (!cover) return;
        event.preventDefault();
        event.stopPropagation();
        flyCoverToDetail(cover, href);
    });
}

function flyCoverToDetail(cover: HTMLImageElement, href: string) {
    const sourceRect = cover.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height) {
        window.location.href = href;
        return;
    }

    // The grid card uses `object-fit: contain`, so the actual rendered
    // image inside the cover element is letterboxed if the natural
    // aspect doesn't match the box aspect. Compute the IMAGE's true
    // rendered rect (not the box rect) so the flight clone reads as
    // exactly the image the user saw — no aspect-ratio mismatch at the
    // start or end of the animation.
    const naturalW = cover.naturalWidth || sourceRect.width;
    const naturalH = cover.naturalHeight || sourceRect.height;
    const naturalAspect = naturalW / naturalH;
    const boxAspect = sourceRect.width / sourceRect.height;
    let srcRenderW: number, srcRenderH: number, srcRenderLeft: number, srcRenderTop: number;
    if (naturalAspect > boxAspect) {
        // Image wider than box → fits width, letterbox top/bottom.
        srcRenderW = sourceRect.width;
        srcRenderH = srcRenderW / naturalAspect;
        srcRenderLeft = sourceRect.left;
        srcRenderTop = sourceRect.top + (sourceRect.height - srcRenderH) / 2;
    } else {
        // Image taller than box → fits height, letterbox sides.
        srcRenderH = sourceRect.height;
        srcRenderW = srcRenderH * naturalAspect;
        srcRenderTop = sourceRect.top;
        srcRenderLeft = sourceRect.left + (sourceRect.width - srcRenderW) / 2;
    }

    // Detail-hero cover on the books detail page is the showcase target.
    // CSS uses `vw` units which include the scrollbar, so width computes
    // off window.innerWidth. Positioning, though, is relative to the
    // visible content area (excludes scrollbar).
    // The hero renders at natural aspect (height auto).
    const cssVw = window.innerWidth;
    const contentVw = document.documentElement.clientWidth;
    const destWidth = cssVw <= BREAKPOINT.mobile
        ? Math.min(cssVw * 0.78, 320)
        : Math.min(cssVw * 0.72, 340);
    const destLeft = (contentVw - destWidth) / 2;
    const destTop = cssVw <= BREAKPOINT.mobile ? HERO_OFFSET_TOP.mobile : HERO_OFFSET_TOP.desktop;

    const clone = cover.cloneNode() as HTMLImageElement;
    clone.removeAttribute('id');
    clone.removeAttribute('loading');
    // Strip the view-transition-name so the browser won't try to also
    // morph it during the navigation that follows.
    clone.style.viewTransitionName = 'none';
    clone.style.position = 'fixed';
    clone.style.left = srcRenderLeft + 'px';
    clone.style.top = srcRenderTop + 'px';
    clone.style.width = srcRenderW + 'px';
    clone.style.height = srcRenderH + 'px';
    // Override object-fit on the clone so the image fills the box
    // exactly — no letterbox inside the clone itself, since we sized
    // the clone box to match the image's rendered aspect.
    clone.style.objectFit = 'fill';
    clone.style.margin = '0';
    clone.style.zIndex = '99999';
    clone.style.transformOrigin = '0 0';
    clone.style.pointerEvents = 'none';
    clone.style.borderRadius = getComputedStyle(cover).borderRadius;
    clone.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.35)';
    // No background — the clone's aspect now matches the natural image
    // so there's nothing to letterbox.
    clone.style.background = 'transparent';

    // Hide the original so we don't render it twice during the flight.
    cover.style.visibility = 'hidden';
    // Also strip view-transition-name from the original so the cross-doc
    // view-transition doesn't try to morph the hidden element during nav.
    (cover.style as CSSStyleDeclaration).viewTransitionName = 'none';

    document.body.appendChild(clone);
    document.body.classList.add('is-book-launching');

    const scale = destWidth / srcRenderW;
    const tx = destLeft - srcRenderLeft;
    const ty = destTop - srcRenderTop;

    const animation = clone.animate(
        [
            {
                transform: 'translate(0px, 0px) scale(1)',
                boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)'
            },
            {
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                // End shadow matches .detail-page--book .detail-hero-cover's
                // own box-shadow exactly so the handoff (clone removed →
                // wrapper shadow takes over) is seamless. Any mismatch
                // here reads as a shading flicker at landing.
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)'
            }
        ],
        {
            duration: TIMING.bookFlight,
            easing: 'cubic-bezier(.22, 1, .36, 1)',
            fill: 'forwards'
        }
    );

    const hardNav = () => {
        // Hand off to the detail page: it will fade its content in
        // around the already-visible hero cover.
        try { sessionStorage.setItem(SESSION_KEYS.bookFlight, '1'); } catch (err) { /* ignore */ }
        window.location.href = href;
    };

    // SPA-style transition: fetch the detail page in parallel with the
    // flight, swap in its <main> as soon as it arrives, and start its
    // content fade-in WHILE the clone is still flying. The clone is the
    // visible "cover" through the whole motion; when it lands at the
    // hero position the hero takes over (also at opacity 1). This gives
    // a single continuous animation where the cover is moving AND the
    // surrounding page content is appearing in parallel.
    let spaTookOver = false;
    fetch(href, { credentials: 'same-origin' })
        .then((res) => res.ok ? res.text() : Promise.reject(new Error(String(res.status))))
        .then((html) => {
            if (spaTookOver) return;
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newMain = doc.querySelector('main.detail-page--book') as HTMLElement | null;
            const oldMain = document.querySelector('main') as HTMLElement | null;
            if (!newMain || !oldMain || !oldMain.parentNode) {
                hardNav();
                return;
            }
            spaTookOver = true;
            const previousTitle = document.title;
            const previousScrollY = window.scrollY;
            const hiddenSidebars = Array.from(document.querySelectorAll<HTMLElement>('.books-sidebar'));
            let handoffComplete = false;
            const cleanupFlightCover = () => {
                clone.remove();
                cover.style.visibility = '';
                (cover.style as CSSStyleDeclaration).viewTransitionName = '';
                document.body.classList.remove('is-book-launching');
            };
            // Carry the detail page's <head> inline styles into the
            // current page so the SPA-injected main has access to
            // every style rule the standalone /books/{slug} page does
            // (showcase hero, etc.). Idempotent — drop any previous
            // SPA-injected blocks before adding the fresh ones so repeat
            // clicks don't pile up duplicates.
            document.querySelectorAll<HTMLStyleElement>('style[data-spa-detail-css="1"]')
                .forEach((existing) => existing.remove());
            doc.querySelectorAll('head style').forEach((style) => {
                const tagged = style.cloneNode(true) as HTMLStyleElement;
                tagged.setAttribute('data-spa-detail-css', '1');
                document.head.appendChild(tagged);
            });
            newMain.classList.add('is-spa-arrival');
            // Belt-and-suspenders: hide the new hero img via inline
            // style too. Class-based opacity rules can flash for one
            // paint frame during JS-driven insertion in some browsers;
            // inline style applies immediately on parse.
            const newHeroImg = newMain.querySelector('.detail-hero-cover img') as HTMLImageElement | null;
            if (newHeroImg) {
                newHeroImg.style.opacity = '0';
                // Stop the image from briefly rendering at its natural
                // raw size before CSS sizes it.
                newHeroImg.style.visibility = 'hidden';
            }
            // Same belt-and-suspenders for newMain itself. The
            // is-spa-arrival CSS hides children at opacity 0, but in
            // light mode users were still seeing a single-frame white
            // flash on click — likely a 1-frame race between class
            // application and the browser's first paint of the
            // injected subtree. Setting inline opacity:0 on newMain
            // itself is iron-clad: nothing in the new main paints
            // until we explicitly fade it in below.
            newMain.style.opacity = '0';
            // Short transition so newMain is fully opaque well BEFORE
            // the flight handoff at TIMING.bookFlight=320ms. Otherwise
            // the wrapper's shadow keeps brightening after the clone
            // lands, reading as a delayed flicker.
            newMain.style.transition = 'opacity 140ms cubic-bezier(.22, 1, .36, 1)';
            oldMain.parentNode.replaceChild(newMain, oldMain);
            // The detail page doesn't render a sidebar — hide the
            // listing sidebar so the new main can center under its
            // already-faded backdrop.
            hiddenSidebars.forEach((el) => { el.style.display = 'none'; });
            document.title = doc.title;
            // Synchronous swap that yanks the SPA-injected detail main
            // back out and restores the listing exactly as it was. Used
            // by the reverse flight after measuring, and as the fallback
            // when no reverse flight is possible.
            const swapListingBack = () => {
                cleanupFlightCover();
                document.querySelectorAll<HTMLStyleElement>('style[data-spa-detail-css="1"]')
                    .forEach((existing) => existing.remove());
                newMain.parentNode!.replaceChild(oldMain, newMain);
                hiddenSidebars.forEach((el) => { el.style.display = ''; });
                document.title = previousTitle;
                window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
            };
            restoreBookListFromSpa = () => {
                if (!newMain.isConnected || !newMain.parentNode) {
                    restoreBookListFromSpa = null;
                    return false;
                }
                // Reverse flight: clone the current hero, swap the
                // listing back in, then animate the clone from hero rect
                // → original grid-card cover rect. Mirrors the forward
                // FLIP so back-navigation feels like the open running
                // in reverse.
                const currentHero = newMain.querySelector('.detail-hero-cover img') as HTMLImageElement | null;
                const heroRect = currentHero?.getBoundingClientRect();
                if (!currentHero || !heroRect || !heroRect.width || !heroRect.height) {
                    swapListingBack();
                    restoreBookListFromSpa = null;
                    return true;
                }
                const backClone = currentHero.cloneNode() as HTMLImageElement;
                backClone.removeAttribute('id');
                backClone.removeAttribute('loading');
                backClone.style.viewTransitionName = 'none';
                backClone.style.position = 'fixed';
                backClone.style.left = `${heroRect.left}px`;
                backClone.style.top = `${heroRect.top}px`;
                backClone.style.width = `${heroRect.width}px`;
                backClone.style.height = `${heroRect.height}px`;
                backClone.style.objectFit = 'fill';
                backClone.style.margin = '0';
                backClone.style.zIndex = '99999';
                backClone.style.transformOrigin = '0 0';
                backClone.style.pointerEvents = 'none';
                backClone.style.borderRadius = getComputedStyle(currentHero).borderRadius;
                // Match the hero wrapper's own shadow so the clone
                // starts the reverse flight visually identical to what
                // the user was just seeing.
                backClone.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.55)';
                backClone.style.background = 'transparent';
                document.body.appendChild(backClone);
                currentHero.style.visibility = 'hidden';

                swapListingBack();
                // Intentionally do NOT re-add is-book-launching — that
                // class fades .books-main and .books-sidebar to opacity 0,
                // which is what we want on the forward open (listing
                // peels away) but the OPPOSITE of what we want on
                // reverse (listing should be fully visible behind the
                // returning cover).

                // Leave the destination cover visible throughout the
                // reverse flight. The clone (z-index 99999) sits on top
                // during flight; when it lands and is removed, the cover
                // underneath is already there pixel-perfectly. Previously
                // we hid the destination to avoid an empty-card flash —
                // that itself caused a different flash at flight end as
                // the cover unhid. Leaving it visible has neither.
                const destRect = cover.getBoundingClientRect();
                const cleanup = () => {
                    backClone.remove();
                };
                if (!destRect.width || !destRect.height) { cleanup(); }
                else {
                    const nW = cover.naturalWidth || destRect.width;
                    const nH = cover.naturalHeight || destRect.height;
                    const nA = nW / nH;
                    const bA = destRect.width / destRect.height;
                    let dW: number, dH: number, dL: number, dT: number;
                    if (nA > bA) {
                        dW = destRect.width;
                        dH = dW / nA;
                        dL = destRect.left;
                        dT = destRect.top + (destRect.height - dH) / 2;
                    } else {
                        dH = destRect.height;
                        dW = dH * nA;
                        dT = destRect.top;
                        dL = destRect.left + (destRect.width - dW) / 2;
                    }
                    const scale = dW / heroRect.width;
                    const tx = dL - heroRect.left;
                    const ty = dT - heroRect.top;
                    const back = backClone.animate(
                        [
                            { transform: 'translate(0px, 0px) scale(1)', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)' },
                            { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)' }
                        ],
                        { duration: TIMING.bookFlight, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
                    );
                    back.finished.then(cleanup).catch(cleanup);
                }
                restoreBookListFromSpa = null;
                return true;
            };
            const backLink = newMain.querySelector<HTMLAnchorElement>('.detail-back[href="/books.html"]');
            backLink?.addEventListener('click', (event) => {
                event.preventDefault();
                history.back();
            });
            // Reset scroll so the new detail-hero ends up at viewport
            // top (matching the clone's flight destination). The clone
            // is position:fixed and stays put across the scroll, and the
            // new main's content is still at opacity 0 (is-spa-arrival),
            // so the scroll is visually invisible.
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            try { history.pushState({ bookFlight: true }, '', href); } catch (err) { /* ignore */ }
            // Force a frame, then add the reveal class so the new main's
            // content transitions from 0 → 1 in parallel with the flight.
            const newMainRevealedAt = { t: 0 };
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newMain.classList.add('is-spa-revealed');
                    // Reveal newMain via the inline opacity fade we set
                    // at injection time (mirrors the is-spa-revealed
                    // class-driven fade for newMain's children).
                    newMain.style.opacity = '1';
                    newMainRevealedAt.t = performance.now();
                });
            });
            // When the clone finishes flying, hand the cover over to the
            // hero img and remove the clone. Both sit at the same
            // pixel-exact position so the swap is invisible.
            const handoff = () => {
                if (handoffComplete || !newMain.isConnected) return;
                handoffComplete = true;
                // Reveal the real hero immediately at full opacity.
                if (newHeroImg) {
                    newHeroImg.style.visibility = '';
                    newHeroImg.style.opacity = '';
                }
                newMain.classList.add('is-spa-cover-revealed');
                // The clone's final position was computed against the
                // hardcoded HERO_OFFSET_TOP, which can be off by a few
                // pixels from the actual rendered hero position. Snap
                // the clone to the MEASURED real-hero rect just before
                // fading it out, so the cross-fade hides any sub-pixel
                // mismatch — no shading flicker.
                if (newHeroImg) {
                    const realRect = newHeroImg.getBoundingClientRect();
                    if (realRect.width && realRect.height) {
                        // Snap the clone to the REAL hero rect with NO
                        // transform. Why: box-shadow is subject to CSS
                        // transforms, so a clone at scale(X) renders a
                        // shadow at X-scaled blur/spread. The wrapper's
                        // CSS shadow is at natural size — switching
                        // from one to the other was making the shadow
                        // visibly shrink ("final-state shadow flicking
                        // in"). At natural width/height with no scale,
                        // the clone's shadow matches the wrapper's
                        // exactly and the cross-fade is pixel-identical.
                        //
                        // DO NOT cancel the animation — cancelling reverts
                        // animated properties (transform, boxShadow) to
                        // their initial inline values (source rect, no
                        // scale), which the browser paints for one
                        // frame before our overrides apply. That's the
                        // "small cover flicker just before handoff".
                        //
                        // Instead, use inline !important to win against
                        // the animation effect's lingering forwards
                        // fill. left/top/width/height aren't animated,
                        // so plain inline is enough for those.
                        clone.style.left = `${realRect.left}px`;
                        clone.style.top = `${realRect.top}px`;
                        clone.style.width = `${realRect.width}px`;
                        clone.style.height = `${realRect.height}px`;
                        clone.style.setProperty('transform', 'none', 'important');
                        clone.style.setProperty('box-shadow', '0 24px 60px rgba(0, 0, 0, 0.55)', 'important');
                        // Match the wrapper img's object-fit so the
                        // visible image content renders IDENTICALLY
                        // between clone and wrapper-img. The wrapper
                        // uses `contain` (with letterbox); clone was
                        // using `fill` (no letterbox). At handoff the
                        // image would visibly shrink to the contained
                        // size — that's the "small version flickering
                        // up" right before the cross-fade completes.
                        clone.style.objectFit = 'contain';
                    }
                }
                // Instant removal — no cross-fade. With the clone now
                // pixel-aligned to the real hero rect (natural size,
                // matched object-fit, matched box-shadow), the wrapper
                // underneath is visually identical to the clone. An
                // instant swap is imperceptible. The earlier cross-fade
                // was itself revealing the underlying wrapper-img
                // through the partly-transparent clone — that's what
                // the user kept seeing as "flicker".
                cleanupFlightCover();
                // Restore sidebar style after cleanup in case the user
                // hits Back — we'll re-render on popstate.
                setTimeout(() => {
                    newMain.classList.remove('is-spa-arrival', 'is-spa-revealed', 'is-spa-cover-revealed');
                    // Drop the inline opacity fade now that the page is
                    // fully revealed — leaving them would interfere
                    // with subsequent renders (e.g. the reverse flight).
                    newMain.style.opacity = '';
                    newMain.style.transition = '';
                }, TIMING.spaArrivalReveal);
            };
            // Wait for BOTH the flight animation AND the newMain opacity
            // reveal (140ms inline transition) before handing off. If
            // fetch was slow, the reveal can still be in progress when
            // the flight ends — handing off then would leave the wrapper
            // (and its shadow) at sub-100% opacity, briefly brightening
            // after the cover lands. That late brighten reads as a
            // shadow flicker. Padding both ensures the page is fully
            // opaque at the exact moment of handoff.
            const waitForReveal = () => new Promise<void>((resolve) => {
                if (newMainRevealedAt.t === 0) {
                    // Reveal hasn't fired yet — SPA-swap must still be
                    // pending. Wait an extra 200ms as a safety bound.
                    setTimeout(resolve, 200);
                    return;
                }
                const elapsed = performance.now() - newMainRevealedAt.t;
                const remaining = Math.max(0, 150 - elapsed); // 140ms + tiny buffer
                if (remaining === 0) resolve();
                else setTimeout(resolve, remaining);
            });
            animation.finished
                .then(() => waitForReveal())
                .then(handoff)
                .catch(handoff);
        })
        .catch(() => {
            // Fallback: hard navigation if anything went wrong. Wait for
            // the flight to finish first so the user still sees the motion.
            animation.finished.then(hardNav).catch(hardNav);
            setTimeout(hardNav, TIMING.bookFlightFallback);
        });

    // If for any reason the SPA path didn't kick in by the time the
    // flight is well past done, fall through to hard nav so the user
    // isn't stranded on a half-faded books page.
    setTimeout(() => { if (!spaTookOver) hardNav(); }, TIMING.bookFlightWatchdog);
}

// Back/forward inside an SPA-swapped book detail page — fall back to a
// full reload so the listing page reinitializes cleanly.
export function installBookFlightPopstate() {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', (event) => {
        if (restoreBookListFromSpa?.()) return;
        const navState = (event.state || {}) as Record<string, unknown>;
        if (navState.bookFlight) window.location.reload();
        // If location is now /books and we have an SPA-injected detail
        // main, the user is going "back" from the SPA swap — reload.
        if (location.pathname.endsWith('/books') || location.pathname.endsWith('/books.html')) {
            const onDetailMain = document.querySelector('main.detail-page--book');
            if (onDetailMain) window.location.reload();
        }
    });
}
