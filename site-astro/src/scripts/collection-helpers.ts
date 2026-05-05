// @ts-nocheck — strict typing deferred; runtime is covered by Playwright + smoke. See POST_AUDIT_PLAN slice 3.3.
// Cross-collection helpers: image error fallback, star drag handler,
// escape-key closer. Replaces duplicated logic across books/letterboxd/podcasts.
(function () {
    let imageErrorInstalled = false;
    function installImageErrorHandler() {
        if (imageErrorInstalled) return;
        imageErrorInstalled = true;
        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLImageElement)) return;
            if (target.dataset.bookCoverFallback === 'true') {
                target.hidden = true;
                target.parentElement?.classList.add('book-cover-missing');
                return;
            }
            if (target.dataset.removeOnError === 'true') target.remove();
        }, true);
    }

    // Drag-to-rate over .filter-star elements inside `container`.
    // halfStars=true enables 0.5 increments based on click x-position.
    function bindStarRatingDrag(container, onChange, options = {}) {
        if (!container) return;
        const halfStars = Boolean(options.halfStars);
        const stars = Array.from(container.querySelectorAll('.filter-star'));
        let dragging = false;
        function valueFor(star, event) {
            const n = Number.parseInt(star.getAttribute('data-star'), 10);
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

    const escapeClosers = [];
    let escapeInstalled = false;
    function installEscapeCloser(closer) {
        if (typeof closer === 'function') escapeClosers.push(closer);
        if (escapeInstalled) return;
        escapeInstalled = true;
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            escapeClosers.forEach((fn) => { try { fn(); } catch (_) { /* swallow */ } });
        });
    }

    window.JGCollectionHelpers = {
        bindStarRatingDrag,
        installEscapeCloser,
        installImageErrorHandler
    };
}());

export const collectionHelpers = window.JGCollectionHelpers;
