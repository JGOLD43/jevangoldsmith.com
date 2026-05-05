// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
(function() {
    'use strict';

    function setStatus(form, message) {
        let status = form.querySelector('[data-newsletter-status]');
        if (!status) {
            status = document.createElement('p');
            status.className = 'newsletter-cta-disclaimer';
            status.setAttribute('data-newsletter-status', '');
            status.setAttribute('aria-live', 'polite');
            form.insertAdjacentElement('afterend', status);
        }
        status.textContent = message;
    }

    async function submitNewsletter(event) {
        const form = event.currentTarget;
        const endpoint = form.getAttribute('data-endpoint');
        if (!endpoint) return;

        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const original = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Sending…';
        }

        try {
            const formData = new FormData(form);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: formData
            });

            if (!response.ok) throw new Error('Newsletter submit failed');
            form.reset();
            setStatus(form, 'You are in. Check your inbox for Field Notes confirmation.');
        } catch (error) {
            setStatus(form, 'That did not go through. Email hello@jevangoldsmith.com and I will add you manually.');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = original;
            }
        }
    }

    document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
        form.addEventListener('submit', submitNewsletter);
    });
})();

export {};
