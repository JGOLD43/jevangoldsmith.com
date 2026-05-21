// Trap focus inside a container while a modal/dialog is open. Saves the
// triggering element (typically the button that opened the modal) so
// focus can be restored when the trap is released.
//
// Usage:
//   const release = trapFocus(modalEl, document.activeElement as HTMLElement);
//   // ... when closing:
//   release();
//
// Behavior:
//   - On install: focuses the first focusable element inside container
//   - On Tab: cycles between first ↔ last focusable
//   - On Shift+Tab from first: jumps to last
//   - On Tab from last: jumps to first
//   - On release: removes listener + restores focus to trigger

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

function focusables(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null);
}

export function trapFocus(container: HTMLElement, trigger: HTMLElement | null = null): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const items = focusables(container);
        if (items.length === 0) {
            e.preventDefault();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    container.addEventListener('keydown', onKeyDown);
    // Defer focus so it happens after the modal becomes visible.
    requestAnimationFrame(() => {
        const items = focusables(container);
        items[0]?.focus();
    });

    return () => {
        container.removeEventListener('keydown', onKeyDown);
        trigger?.focus();
    };
}
