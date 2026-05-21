// Idempotent-install helper. Use for any "ensure this DOM listener (or
// other side effect) attaches exactly once across all module imports,
// including ones that span code-split bundles."
//
// Why globalThis: an ES-module-level boolean works fine for a single
// bundle, but code-splitting can produce two instances of the same module
// landing on a page. globalThis is a single shared slot regardless of
// chunking.
//
// Pattern: pass a unique key per install site. Convention is
// `__jg<feature>Installed`.

type GlobalFlags = typeof globalThis & Record<string, boolean | undefined>;

export function installOnce(key: string, fn: () => void): void {
    const g = globalThis as GlobalFlags;
    if (g[key]) return;
    g[key] = true;
    fn();
}
