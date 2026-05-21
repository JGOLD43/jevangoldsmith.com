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
            const newHero = newMain.querySelector(cfg.detailHeroImgSelector) as HTMLImageElement | null;
            if (newHero) {
                newHero.style.opacity = '0';
                newHero.style.visibility = 'hidden';
            }

            oldMain.parentNode.replaceChild(newMain, oldMain);
            (cfg.listingBackSelectors || []).forEach((sel) => {
                document.querySelectorAll<HTMLElement>(sel).forEach((el) => { el.style.display = 'none'; });
            });
            document.title = doc.title;
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            try { history.pushState({ coverFlight: cfg.arrivalKey }, '', href); } catch { /* ignore */ }

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

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => newMain.classList.add(revealCls));
                });

                const handoff = () => {
                    if (newHero) {
                        newHero.style.visibility = '';
                        newHero.style.opacity = '';
                    }
                    newMain.classList.add(coverRevealCls);
                    clone.remove();
                    cover.style.visibility = '';
                    (cover.style as CSSStyleDeclaration).viewTransitionName = '';
                    document.body.classList.remove(cfg.bodyLaunchClass);
                    setTimeout(() => {
                        newMain.classList.remove(arrivalCls, revealCls, coverRevealCls);
                    }, 240);
                };
                flightAnim.finished.then(handoff).catch(handoff);
            });
        })
        .catch(() => {
            holdAnim.finished.then(hardNav).catch(hardNav);
            setTimeout(hardNav, 380);
        });

    setTimeout(() => { if (!spaTookOver) hardNav(); }, 1200);
}
