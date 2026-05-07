// Tiny DOM helpers — null-safe variants of the patterns repeated dozens of
// times across page scripts. Each removes a one-line if-guard at the
// callsite.

export function setClass(el: Element | null | undefined, name: string, on: boolean): void {
    if (el) el.classList.toggle(name, on);
}

export function setHidden(el: HTMLElement | null | undefined, hidden: boolean): void {
    if (el) el.style.display = hidden ? 'none' : '';
}

export function setText(el: Element | null | undefined, text: string): void {
    if (el) el.textContent = text;
}
