(function () {
    const registry: Record<string, unknown> = Object.create(null);

    function register(actions: Record<string, unknown> | null | undefined) {
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

    document.addEventListener('click', function (event) {
        runAction(event, 'click');
    });

    document.addEventListener('input', function (event) {
        runAction(event, 'input');
    });

    document.addEventListener('submit', function (event) {
        runAction(event, 'submit');
    });

    window.JGActions = { register };
}());

export const actionDispatcher = window.JGActions;
