// Generic FLIP-style cover-to-detail page transition. Modeled after the
// books flight in scripts/books.ts but parameterized for other collections.
//
// On click: clone the card's <img>, fix-position it at the source rect,
// fetch the detail page in parallel, swap in its <main>, measure the real
// destination hero rect, then animate the clone src → dest while the new
// main fades in. Hand off to the real hero img when the clone lands.

export interface CoverFlightConfig {
    grid: HTMLElement;
    cardSelector: string;            // e.g. 'a.project-card'
    coverSelector: string;           // e.g. 'img.project-cover'
    detailMainSelector: string;      // e.g. 'main.detail-page--project'
    detailHeroImgSelector: string;   // selector relative to the detail main
    bodyLaunchClass: string;         // e.g. 'is-project-launching'
    arrivalKey: string;              // e.g. 'project' (used in class + storage names)
    listingBackSelectors?: string[]; // siblings to hide after swap (sidebars etc.)
    durationMs?: number;
}

const POP_HOOK_FLAG = '__coverFlightPopHooked';

// When the SPA-swap forward flight completes, we register a reverse-flight
// closure here so the popstate handler can fly the cover back to its grid
// position before swapping the listing main back in. One entry per
// arrivalKey at a time — opening another card replaces it.
const reverseRunners = new Map<string, () => boolean>();

export function initCoverFlight(cfg: CoverFlightConfig) {
    if (!cfg.grid) return;
    cfg.grid.addEventListener('click', (event) => {
        if (event.defaultPrevented) return;
        const target = event.target as Element | null;
        if (!target) return;
        const card = target.closest(cfg.cardSelector) as HTMLAnchorElement | null;
        if (!card) return;
        const href = card.getAttribute('href');
        if (!href || href === '#') return;
        const cover = card.querySelector(cfg.coverSelector) as HTMLImageElement | null;
        if (!cover || cover.tagName !== 'IMG') return;
        // Respect modifier clicks (open-in-new-tab etc.).
        const me = event as MouseEvent;
        if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey || me.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        flyCover(cover, href, cfg);
    });

    hookPopStateOnce();
}

function hookPopStateOnce() {
    if (typeof window === 'undefined') return;
    const w = window as unknown as Record<string, unknown>;
    if (w[POP_HOOK_FLAG]) return;
    w[POP_HOOK_FLAG] = true;
    window.addEventListener('popstate', (event) => {
        const state = (event.state || {}) as Record<string, unknown>;
        // Forward flight pushed { coverFlight: arrivalKey }. The previous
        // history entry has either no state or a different arrivalKey, so
        // when we pop we get the OLD state here — meaning we're going
        // back from a detail page. Try every registered reverse runner;
        // the one whose newMain is still connected to the doc wins.
        let restored = false;
        for (const [, runner] of reverseRunners) {
            if (runner()) { restored = true; break; }
        }
        if (restored) return;
        if (state && state.coverFlight) window.location.reload();
    });
}

function flyCover(cover: HTMLImageElement, href: string, cfg: CoverFlightConfig) {
    const sourceRect = cover.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height) {
        window.location.href = href;
        return;
    }

    // Compute the image's true rendered rect inside the (possibly letterboxed)
    // card box so the clone reads as exactly the image the user saw.
    const naturalW = cover.naturalWidth || sourceRect.width;
    const naturalH = cover.naturalHeight || sourceRect.height;
    const naturalAspect = naturalW / naturalH;
    const boxAspect = sourceRect.width / sourceRect.height;
    let srcW: number, srcH: number, srcL: number, srcT: number;
    if (naturalAspect > boxAspect) {
        srcW = sourceRect.width;
        srcH = srcW / naturalAspect;
        srcL = sourceRect.left;
        srcT = sourceRect.top + (sourceRect.height - srcH) / 2;
    } else {
        srcH = sourceRect.height;
        srcW = srcH * naturalAspect;
        srcT = sourceRect.top;
        srcL = sourceRect.left + (sourceRect.width - srcW) / 2;
    }

    const clone = cover.cloneNode() as HTMLImageElement;
    clone.removeAttribute('id');
    clone.removeAttribute('loading');
    clone.style.viewTransitionName = 'none';
    clone.style.position = 'fixed';
    clone.style.left = `${srcL}px`;
    clone.style.top = `${srcT}px`;
    clone.style.width = `${srcW}px`;
    clone.style.height = `${srcH}px`;
    clone.style.objectFit = 'fill';
    clone.style.margin = '0';
    clone.style.zIndex = '99999';
    clone.style.transformOrigin = '0 0';
    clone.style.pointerEvents = 'none';
    clone.style.borderRadius = getComputedStyle(cover).borderRadius;
    clone.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.35)';
    clone.style.background = 'transparent';

    cover.style.visibility = 'hidden';
    (cover.style as CSSStyleDeclaration).viewTransitionName = 'none';

    document.body.appendChild(clone);
    document.body.classList.add(cfg.bodyLaunchClass);

    const duration = cfg.durationMs ?? 340;
    const arrivalCls = `is-${cfg.arrivalKey}-arrival`;
    const revealCls = `is-${cfg.arrivalKey}-revealed`;
    const coverRevealCls = `is-${cfg.arrivalKey}-cover-revealed`;
    const storageKey = `${cfg.arrivalKey}-flight-arrival`;

    const hardNav = () => {
        try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
        window.location.href = href;
    };

    // Subtle holding animation — clone lifts slightly while we wait for
    // the detail page to arrive. Replaced by the real flight once we can
    // measure the destination.
    const holdAnim = clone.animate(
        [
            { transform: 'translate(0px, 0px) scale(1)', boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)' },
            { transform: 'translate(0px, -6px) scale(1.02)', boxShadow: '0 14px 34px rgba(0, 0, 0, 0.45)' }
        ],
        { duration: 180, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
    );

    let spaTookOver = false;

    fetch(href, { credentials: 'same-origin' })
        .then((res) => res.ok ? res.text() : Promise.reject(new Error(String(res.status))))
        .then((html) => {
            if (spaTookOver) return;
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newMain = doc.querySelector(cfg.detailMainSelector) as HTMLElement | null;
            const oldMain = document.querySelector('main') as HTMLElement | null;
            if (!newMain || !oldMain || !oldMain.parentNode) {
                hardNav();
                return;
            }
            spaTookOver = true;

            // Carry the detail page's inline <head> styles into the
            // current doc so the SPA-injected main has access to every
            // style rule the standalone page does.
            document.querySelectorAll<HTMLStyleElement>(`style[data-spa-detail-css="${cfg.arrivalKey}"]`)
                .forEach((existing) => existing.remove());
            doc.querySelectorAll('head style').forEach((style) => {
                const tagged = style.cloneNode(true) as HTMLStyleElement;
                tagged.setAttribute('data-spa-detail-css', cfg.arrivalKey);
                document.head.appendChild(tagged);
            });

            newMain.classList.add(arrivalCls);
            // Hide the entire new detail main before injection so the
            // user never sees an unstyled / fully-revealed flash of the
            // detail content the instant it lands in the DOM. Pages with
            // their own arrival CSS (books) use class-based opacity on
            // children; for everything else this inline fallback handles
            // the staging. Duration is short and well under the flight
            // duration so newMain is fully opaque BEFORE handoff —
            // otherwise the wrapper's shadow inside newMain would still
            // be brightening after the clone lands, reading as a
            // delayed shadow flicker.
            newMain.style.opacity = '0';
            newMain.style.transition = 'opacity 140ms cubic-bezier(.22, 1, .36, 1)';
            const newHero = newMain.querySelector(cfg.detailHeroImgSelector) as HTMLImageElement | null;
            if (newHero) {
                newHero.style.opacity = '0';
                newHero.style.visibility = 'hidden';
            }

            // Snapshot listing state so the reverse flight can restore it.
            const previousTitle = document.title;
            const previousScrollY = window.scrollY;
            const hiddenBacks = (cfg.listingBackSelectors || []).flatMap((sel) =>
                Array.from(document.querySelectorAll<HTMLElement>(sel))
            );

            oldMain.parentNode.replaceChild(newMain, oldMain);
            hiddenBacks.forEach((el) => { el.style.display = 'none'; });
            document.title = doc.title;
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            try { history.pushState({ coverFlight: cfg.arrivalKey }, '', href); } catch { /* ignore */ }

            // Register reverse flight. Runs on popstate (browser back or
            // wrapped .detail-back link). Mirrors the forward flight:
            // clone the current hero, swap the listing main back in to
            // make the destination cover laid out, then animate the
            // clone from hero rect → original cover rect.
            const runReverseFlight = (): boolean => {
                if (!newMain.isConnected || !oldMain) return false;
                reverseRunners.delete(cfg.arrivalKey);
                const currentHero = newMain.querySelector(cfg.detailHeroImgSelector) as HTMLImageElement | null;
                const heroRect = currentHero?.getBoundingClientRect();
                const restoreListingDOM = () => {
                    if (!newMain.parentNode) return;
                    document.querySelectorAll<HTMLStyleElement>(`style[data-spa-detail-css="${cfg.arrivalKey}"]`)
                        .forEach((existing) => existing.remove());
                    newMain.parentNode.replaceChild(oldMain, newMain);
                    hiddenBacks.forEach((el) => { el.style.display = ''; });
                    document.title = previousTitle;
                    window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
                };
                if (!currentHero || !heroRect || !heroRect.width || !heroRect.height) {
                    restoreListingDOM();
                    cover.style.visibility = '';
                    (cover.style as CSSStyleDeclaration).viewTransitionName = '';
                    document.body.classList.remove(cfg.bodyLaunchClass);
                    return true;
                }
                // Clone hero at its current rect — this is the new flight source.
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
                backClone.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.45)';
                backClone.style.background = 'transparent';
                document.body.appendChild(backClone);
                currentHero.style.visibility = 'hidden';
                // Intentionally NOT adding cfg.bodyLaunchClass here —
                // forward uses it to fade the listing away, but during
                // reverse we want the listing fully visible behind the
                // returning cover.

                restoreListingDOM();

                // Leave the destination cover VISIBLE throughout the
                // reverse flight. The clone (z-index 99999) sits on top
                // of the destination during flight; when it lands and is
                // removed, the cover underneath is already there pixel-
                // perfectly — no flash, no swap timing to get wrong.
                const destRect = cover.getBoundingClientRect();
                const cleanup = () => {
                    backClone.remove();
                    (cover.style as CSSStyleDeclaration).viewTransitionName = '';
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
                            { transform: 'translate(0px, 0px) scale(1)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)' },
                            { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)' }
                        ],
                        { duration, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
                    );
                    back.finished.then(cleanup).catch(cleanup);
                }
                return true;
            };
            reverseRunners.set(cfg.arrivalKey, runReverseFlight);

            // Wrap the detail page's back link so it triggers history.back(),
            // which fires our popstate → reverse flight.
            const backLink = newMain.querySelector<HTMLAnchorElement>('.detail-back');
            backLink?.addEventListener('click', (event) => {
                event.preventDefault();
                history.back();
            });

            // Measure destination after injection. The hero is laid out
            // (visibility:hidden preserves layout) so we get a real rect.
            requestAnimationFrame(() => {
                const destRect = newHero ? newHero.getBoundingClientRect() : null;
                let flightAnim: Animation;
                if (destRect && destRect.width && destRect.height) {
                    holdAnim.cancel();
                    // Reset clone transform so the next animation starts at identity.
                    clone.style.transform = 'translate(0px, 0px) scale(1)';
                    const scale = destRect.width / srcW;
                    const tx = destRect.left - srcL;
                    const ty = destRect.top - srcT;
                    flightAnim = clone.animate(
                        [
                            { transform: 'translate(0px, 0px) scale(1)', boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)' },
                            { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)' }
                        ],
                        { duration, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
                    );
                } else {
                    flightAnim = clone.animate(
                        [{ opacity: 1 }, { opacity: 0 }],
                        { duration: 200, fill: 'forwards' }
                    );
                }

                const newMainRevealedAt = { t: 0 };
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        newMain.classList.add(revealCls);
                        // Reveal the detail content (inline fallback —
                        // see comment at injection time).
                        newMain.style.opacity = '1';
                        newMainRevealedAt.t = performance.now();
                    });
                });

                const handoff = () => {
                    if (newHero) {
                        newHero.style.visibility = '';
                        newHero.style.opacity = '';
                    }
                    newMain.classList.add(coverRevealCls);
                    // Snap the clone to the real hero rect with NO
                    // transform so its box-shadow renders at natural
                    // CSS size — pixel-identical to the wrapper's
                    // shadow underneath. Without this, the clone's
                    // scaled transform also scales its shadow, and
                    // when the clone is removed the visible shadow
                    // suddenly shrinks to the wrapper's natural size
                    // ("final-state shadow flicking in"). Matching the
                    // wrapper's shadow value exactly makes the cross-
                    // fade pixel-identical to the underlying wrapper.
                    if (newHero) {
                        const realRect = newHero.getBoundingClientRect();
                        if (realRect.width && realRect.height) {
                            // DO NOT cancel the flight animation —
                            // cancelling reverts the animated transform
                            // + boxShadow to their initial values
                            // (source rect, no scale) for one paint
                            // frame, which the user perceives as a
                            // "small cover flicker" at the source
                            // grid-card position just before handoff.
                            // Use inline !important to win against the
                            // animation's lingering forwards fill.
                            clone.style.left = `${realRect.left}px`;
                            clone.style.top = `${realRect.top}px`;
                            clone.style.width = `${realRect.width}px`;
                            clone.style.height = `${realRect.height}px`;
                            clone.style.setProperty('transform', 'none', 'important');
                            clone.style.setProperty('box-shadow', '0 18px 50px rgba(0, 0, 0, 0.47)', 'important');
                            // Match the wrapper img's object-fit so the
                            // visible image content renders IDENTICALLY
                            // between clone and wrapper-img. Movies use
                            // `cover` (crops to fill); clone was using
                            // `fill`. The mismatch made the image
                            // visually shift at handoff — the "small
                            // cover flicker" right before cross-fade
                            // completion.
                            clone.style.objectFit = 'cover';
                        }
                    }
                    clone.style.transition = 'opacity 100ms linear';
                    clone.style.opacity = '0';
                    setTimeout(() => clone.remove(), 110);
                    cover.style.visibility = '';
                    (cover.style as CSSStyleDeclaration).viewTransitionName = '';
                    document.body.classList.remove(cfg.bodyLaunchClass);
                    setTimeout(() => {
                        newMain.classList.remove(arrivalCls, revealCls, coverRevealCls);
                        // Drop the inline opacity/transition fallback now
                        // that the page is fully revealed — leaving them
                        // behind would interfere with subsequent renders.
                        newMain.style.opacity = '';
                        newMain.style.transition = '';
                    }, 320);
                };
                // Wait for the newMain reveal (140ms) to fully complete
                // before handing off — same reasoning as books-flight.
                // If the reveal is still in progress at handoff, the
                // wrapper's shadow inside newMain keeps brightening
                // past flight end and reads as a delayed flicker.
                const waitForReveal = () => new Promise<void>((resolve) => {
                    if (newMainRevealedAt.t === 0) {
                        setTimeout(resolve, 200);
                        return;
                    }
                    const elapsed = performance.now() - newMainRevealedAt.t;
                    const remaining = Math.max(0, 150 - elapsed);
                    if (remaining === 0) resolve();
                    else setTimeout(resolve, remaining);
                });
                flightAnim.finished
                    .then(() => waitForReveal())
                    .then(handoff)
                    .catch(handoff);
            });
        })
        .catch(() => {
            holdAnim.finished.then(hardNav).catch(hardNav);
            setTimeout(hardNav, 380);
        });

    setTimeout(() => { if (!spaTookOver) hardNav(); }, 1200);
}
