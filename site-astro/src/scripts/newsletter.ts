import { isAcceptedSignup, signupAttribution, type SignupAttribution } from '../lib/newsletter-attribution';

const ATTRIBUTION_KEY = 'jg-newsletter-attribution-v1';
function attribution(): SignupAttribution {
    const current = signupAttribution(window.location.href, document.referrer);
    try {
        const saved = sessionStorage.getItem(ATTRIBUTION_KEY);
        if (saved) return JSON.parse(saved) as SignupAttribution;
        sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
    } catch { /* Signup works when browser storage is unavailable. */ }
    return current;
}

function setStatus(form: HTMLFormElement, message: string, state: 'ok' | 'error'): void {
    const status = form.closest('.signup')?.querySelector<HTMLElement>('[data-newsletter-status]');
    if (!status) return;
    status.dataset.state = state;
    status.textContent = message;
}

async function submitNewsletter(event: SubmitEvent): Promise<void> {
    const form = event.currentTarget as HTMLFormElement;
    const signupPage = form.elements.namedItem('signup_page') as HTMLInputElement | null;
    if (signupPage) signupPage.value = window.location.pathname;
    // Hosted providers own confirmation, subscriber storage and errors.
    if (form.dataset.deliveryMode === 'hosted') return;
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;
    const endpoint = form.dataset.endpoint;
    if (!endpoint) return;
    const trap = form.elements.namedItem('_honey') as HTMLInputElement | null;
    if (trap?.value) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const original = button?.textContent ?? 'Get my updates';
    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(endpoint, {
            method: 'POST', headers: { Accept: 'application/json' },
            body: new FormData(form), signal: controller.signal
        });
        const result: unknown = await response.json();
        if (!response.ok || !isAcceptedSignup(result)) throw new Error('Signup not accepted');
        form.reset();
        setStatus(form, 'Thanks—your signup request has been sent to Jevan. This list is currently managed manually; no automatic confirmation email has been sent.', 'ok');
    } catch {
        setStatus(form, 'We couldn’t confirm your signup. Please try again, or email hello@jevangoldsmith.com and ask to join the monthly updates.', 'error');
    } finally {
        window.clearTimeout(timeout);
        delete form.dataset.submitting;
        form.removeAttribute('aria-busy');
        if (button) { button.disabled = false; button.textContent = original; }
    }
}

function initNewsletter() {
    const source = attribution();
    document.querySelectorAll<HTMLFormElement>('[data-newsletter-form]').forEach((form) => {
        for (const [name, value] of Object.entries(source)) {
            const input = document.createElement('input');
            input.type = 'hidden'; input.name = name; input.value = value;
            form.append(input);
        }
        form.addEventListener('submit', submitNewsletter);
    });
}

// A speculative navigation must not become the recorded landing page.
if ((document as Document & { prerendering?: boolean }).prerendering) document.addEventListener('prerenderingchange', initNewsletter, { once: true });
else initNewsletter();
