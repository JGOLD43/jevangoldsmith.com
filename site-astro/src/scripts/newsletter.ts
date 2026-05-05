(function() {
    'use strict';

    function setStatus(form: HTMLFormElement, message: string): void {
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

    async function submitNewsletter(event: SubmitEvent): Promise<void> {
        const form = event.currentTarget as HTMLFormElement;
        const endpoint = form.getAttribute('data-endpoint');
        if (!endpoint) return;

        event.preventDefault();
        const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
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
        form.addEventListener('submit', submitNewsletter as EventListener);
    });
})();

export {};
