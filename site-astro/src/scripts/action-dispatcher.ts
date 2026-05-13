// Site-wide data-action dispatcher. Single document-level click/input/submit
// listener resolves actions by name from a per-page registry, falling
// through to window for legacy bare-function references.
//
// ES modules are singletons within a page, so importing this from multiple
// scripts still installs one set of listeners and shares one registry.

const registry: Record<string, unknown> = Object.create(null);

export function registerActions(actions: Record<string, unknown> | null | undefined) {
    Object.assign(registry, actions || {});
}

function resolveAction(name: string | undefined): unknown {
    if (!name) return undefined;
    return registry[name] || (window as unknown as Record<string, unknown>)[name];
}

function defaultEventType(el: Element): string {
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
    return 'click';
}

function parseArgs(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split('|').map((value) => decodeURIComponent(value));
}

function findActionTarget(event: Event, eventType: string): HTMLElement | null {
    const target = event.target as Element | null;
    if (eventType === 'click') {
        return (target?.closest('[data-action]') as HTMLElement | null) || null;
    }
    if (target && (target as Element).matches?.('[data-action]')) {
        return target as HTMLElement;
    }
    return null;
}

function runAction(event: Event, eventType: string) {
    const el = findActionTarget(event, eventType);
    if (!el) return;

    const ds = el.dataset;
    const actionEvent = ds.actionEvent || defaultEventType(el);
    if (actionEvent !== eventType) return;

    const fnName = ds.action;
    const fn = resolveAction(fnName);
    if (typeof fn !== 'function') return;

    const args: unknown[] = parseArgs(ds.actionArgs);
    if (ds.actionValue === 'true') args.push((el as HTMLInputElement).value);
    if (ds.actionThis === 'true') args.push(el);
    if (ds.actionEventobj === 'true') args.push(event);

    const result = (fn as (...a: unknown[]) => unknown).apply(window, args);
    if (ds.actionPreventDefault === 'true' || result === false) {
        event.preventDefault();
    }
}

// Idempotency guard: multiple module imports across page scripts still
// land on a single set of document-level listeners.
const installedKey = '__jgActionsInstalled';
type GlobalWithFlag = typeof globalThis & Record<string, boolean | undefined>;
const g = globalThis as GlobalWithFlag;
if (!g[installedKey]) {
    g[installedKey] = true;
    document.addEventListener('click', (event) => runAction(event, 'click'));
    document.addEventListener('input', (event) => runAction(event, 'input'));
    document.addEventListener('submit', (event) => runAction(event, 'submit'));
}
