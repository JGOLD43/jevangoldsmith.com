// Shared AJAX handler for the contact + meet forms. Mirrors newsletter.ts:
// posts to a formsubmit.co/ajax endpoint so the message is actually delivered
// (the old mailto: GET forms silently failed for anyone without a desktop
// mail client). Falls back to a visible status message on error.

function setStatus(form: HTMLFormElement, message: string, ok: boolean): void {
    let status = form.querySelector('[data-contact-status]');
    if (!status) {
        status = document.createElement('p');
        status.className = 'contact-form-status';
        status.setAttribute('data-contact-status', '');
        status.setAttribute('aria-live', 'polite');
        form.insertAdjacentElement('afterend', status);
    }
    status.textContent = message;
    status.setAttribute('data-state', ok ? 'ok' : 'error');
}

async function submitContact(event: SubmitEvent): Promise<void> {
    const form = event.currentTarget as HTMLFormElement;
    const endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) return;

    event.preventDefault();
    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    const label = button?.querySelector('span') ?? button;
    const original = label ? label.textContent : '';
    if (button) button.disabled = true;
    if (label) label.textContent = 'Sending…';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form)
        });
        if (!response.ok) throw new Error('Contact submit failed');
        form.reset();
        setStatus(form, 'Thanks — your message is on its way. I usually reply within 24–48 hours.', true);
    } catch (_error) {
        setStatus(form, 'That did not go through. Email hello@jevangoldsmith.com directly and I will get back to you.', false);
    } finally {
        if (button) button.disabled = false;
        if (label) label.textContent = original;
    }
}

document.querySelectorAll('[data-contact-form]').forEach((form) => {
    form.addEventListener('submit', submitContact as EventListener);
});
