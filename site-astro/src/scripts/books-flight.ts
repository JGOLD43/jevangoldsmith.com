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
    // The hero renders at natural aspect (height auto), so destHeight is
    // computed from naturalAspect — guarantees the clone end frame has
    // the same aspect/size as the hero.
    const cssVw = window.innerWidth;
    const contentVw = document.documentElement.clientWidth;
    const destWidth = cssVw <= 640
        ? Math.min(cssVw * 0.78, 320)
        : Math.min(cssVw * 0.72, 340);
    const destHeight = destWidth / naturalAspect;
    const destLeft = (contentVw - destWidth) / 2;
    // Empirically measured against the rendered detail-hero on the same
    // viewport. The detail page renders the "Back to Books" link + hero
    // margin under the navbar at this y.
    const destTop = cssVw <= 640 ? 123 : 165;

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
                boxShadow: '0 28px 60px rgba(0, 0, 0, 0.55)'
            }
        ],
        {
            duration: 320,
            easing: 'cubic-bezier(.22, 1, .36, 1)',
            fill: 'forwards'
        }
    );

    const hardNav = () => {
        // Hand off to the detail page: it will fade its content in
        // around the already-visible hero cover.
        try { sessionStorage.setItem('book-flight-arrival', '1'); } catch (err) { /* ignore */ }
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
            oldMain.parentNode.replaceChild(newMain, oldMain);
            // The detail page doesn't render a sidebar — hide the
            // listing sidebar so the new main can center under its
            // already-faded backdrop.
            document.querySelectorAll<HTMLElement>('.books-sidebar')
                .forEach((el) => { el.style.display = 'none'; });
            document.title = doc.title;
            // Reset scroll so the new detail-hero ends up at viewport
            // top (matching the clone's flight destination). The clone
            // is position:fixed and stays put across the scroll, and the
            // new main's content is still at opacity 0 (is-spa-arrival),
            // so the scroll is visually invisible.
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            try { history.pushState({ bookFlight: true }, '', href); } catch (err) { /* ignore */ }
            // Force a frame, then add the reveal class so the new main's
            // content transitions from 0 → 1 in parallel with the flight.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newMain.classList.add('is-spa-revealed');
                });
            });
            // When the clone finishes flying, hand the cover over to the
            // hero img and remove the clone. Both sit at the same
            // pixel-exact position so the swap is invisible.
            const handoff = () => {
                // Reveal the real hero (clear the inline hides we set
                // at injection time) and remove the clone in the same
                // tick — both occupy identical pixel-exact rects so the
                // swap is invisible.
                if (newHeroImg) {
                    newHeroImg.style.visibility = '';
                    newHeroImg.style.opacity = '';
                }
                newMain.classList.add('is-spa-cover-revealed');
                clone.remove();
                cover.style.visibility = '';
                (cover.style as CSSStyleDeclaration).viewTransitionName = '';
                document.body.classList.remove('is-book-launching');
                // Restore sidebar style after cleanup in case the user
                // hits Back — we'll re-render on popstate.
                setTimeout(() => {
                    newMain.classList.remove('is-spa-arrival', 'is-spa-revealed', 'is-spa-cover-revealed');
                }, 240);
            };
            animation.finished
                .then(handoff)
                .catch(handoff);
        })
        .catch(() => {
            // Fallback: hard navigation if anything went wrong. Wait for
            // the flight to finish first so the user still sees the motion.
            animation.finished.then(hardNav).catch(hardNav);
            setTimeout(hardNav, 380);
        });

    // If for any reason the SPA path didn't kick in by the time the
    // flight is well past done, fall through to hard nav so the user
    // isn't stranded on a half-faded books page.
    setTimeout(() => { if (!spaTookOver) hardNav(); }, 900);
}

// Back/forward inside an SPA-swapped book detail page — fall back to a
// full reload so the listing page reinitializes cleanly.
export function installBookFlightPopstate() {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', (event) => {
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
