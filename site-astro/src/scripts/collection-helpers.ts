// Cross-collection helpers: image error fallback, star drag handler,
// escape-key closer, card visibility toggle. Replaces duplicated logic
// across books/letterboxd/podcasts/people.

import { installOnce } from '../lib/install-once';

// Toggle visibility of cards inside a container based on a Set of IDs
// derived from each card's dataset. Pages SSR every card; filter passes
// just hide/show. ids() is a function so callers can pull from any
// dataset key (data-isbn for books, data-movie-title for movies, etc).
export function applyCardVisibility(
    container: HTMLElement | null,
    visibleIds: Set<string>,
    cardSelector: string,
    idsFor: (card: HTMLElement) => string[]
): void {
    if (!container) return;
    container.querySelectorAll<HTMLElement>(cardSelector).forEach((card) => {
        const ids = idsFor(card);
        const visible = ids.some((id) => visibleIds.has(id));
        card.style.display = visible ? '' : 'none';
    });
}



// If the image lives in a carousel slot wrapper (e.g. <a class="carousel-book-link">),
// remove the whole slot — otherwise the empty link leaves a phantom gap.
function removeCarouselSlot(img: HTMLImageElement) {
    const slot = img.closest('.carousel-book-link');
    (slot ?? img).remove();
}

export function installImageErrorHandler() {
    installOnce('__jgImageErrorInstalled', () => {
        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLImageElement)) return;
            if (target.dataset.bookCoverFallback === 'true') {
                target.hidden = true;
                target.parentElement?.classList.add('book-cover-missing');
                return;
            }
            if (target.dataset.removeOnError === 'true') removeCarouselSlot(target);
        }, true);
        // OpenLibrary serves a 1×1 transparent PNG when no cover exists, which
        // loads "successfully" so the error handler above never fires. Treat
        // tiny images as missing for elements opted into removeOnError.
        document.addEventListener('load', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLImageElement)) return;
            if (target.dataset.removeOnError !== 'true') return;
            if (target.naturalWidth > 0 && target.naturalWidth < 10) removeCarouselSlot(target);
        }, true);
    });
}

// Drag-to-rate over .filter-star elements inside `container`.
// halfStars=true enables 0.5 increments based on click x-position.
export function bindStarRatingDrag(container: ParentNode | null, onChange: (value: number) => void, options: { halfStars?: boolean } = {}) {
    if (!container) return;
    const halfStars = Boolean(options.halfStars);
    const stars = Array.from(container.querySelectorAll<HTMLElement>('.filter-star'));
    let dragging = false;
    function valueFor(star: HTMLElement, event: MouseEvent): number {
        const n = Number.parseInt(star.getAttribute('data-star') || '0', 10);
        if (!halfStars) return n;
        const rect = star.getBoundingClientRect();
        const isLeftHalf = (event.clientX - rect.left) < rect.width / 2;
        return isLeftHalf ? n - 0.5 : n;
    }
    stars.forEach((star) => {
        star.addEventListener('click', (event) => onChange(valueFor(star, event)));
        star.addEventListener('mousedown', (event) => {
            dragging = true;
            onChange(valueFor(star, event));
        });
        star.addEventListener('mouseenter', (event) => {
            if (dragging) onChange(valueFor(star, event));
        });
    });
    document.addEventListener('mouseup', () => { dragging = false; });
}

const escapeClosers: Array<() => void> = [];
export function installEscapeCloser(closer: () => void) {
    if (typeof closer === 'function') escapeClosers.push(closer);
    installOnce('__jgEscapeCloserInstalled', () => {
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            escapeClosers.forEach((fn) => { try { fn(); } catch (_) { /* swallow */ } });
        });
    });
}
