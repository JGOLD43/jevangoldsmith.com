// Site-wide data-action dispatcher. Single document-level click/input/submit
// listener resolves actions by name from a per-page registry, falling
// through to window for legacy bare-function references.
//
// ES modules are singletons within a page, so importing this from multiple
// scripts still installs one set of listeners and shares one registry.

export type ActionFn = (...args: unknown[]) => unknown;
export type ActionRegistry = Record<string, ActionFn>;

const registry: ActionRegistry = Object.create(null);

// Track ALL action names ever attempted via [data-action] so we can warn on
// typos when a markup attribute names something that was never registered.
const knownAttempts = new Set<string>();

export function registerActions(actions: ActionRegistry | null | undefined): void {
    if (!actions) return;
    for (const [name, fn] of Object.entries(actions)) {
        if (typeof fn !== 'function') {
            console.warn(`[action-dispatcher] ignored non-function registration for "${name}"`);
            continue;
        }
        registry[name] = fn;
    }
}

// Optional helper for callsites that want strong-typed function shapes.
// Pass a literal map and TS will infer the names; consumers can then call
// declared(reg).foo(...) instead of stringly-typed dispatch.
export function declareActions<T extends ActionRegistry>(actions: T): T {
    registerActions(actions);
    return actions;
}

function resolveAction(name: string | undefined): unknown {
    if (!name) return undefined;
    const registered = registry[name];
    if (registered) return registered;
    const windowFallback = (window as unknown as Record<string, unknown>)[name];
    if (typeof windowFallback === 'function') return windowFallback;
    // First time we see this name miss the registry → log once. Typo catcher.
    if (!knownAttempts.has(name)) {
        knownAttempts.add(name);
        console.warn(`[action-dispatcher] data-action="${name}" fired but no handler is registered (typo?)`);
    }
    return undefined;
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
import { installOnce } from '../lib/install-once';
installOnce('__jgActionsInstalled', () => {
    document.addEventListener('click', (event) => runAction(event, 'click'));
    document.addEventListener('input', (event) => runAction(event, 'input'));
    document.addEventListener('submit', (event) => runAction(event, 'submit'));
});
