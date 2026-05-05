// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
// Phase 3 slice 3.1: named ES export. The legacy `window.JGTaskList`
// global stays exposed as a backwards-compat shim, but consumers should
// use `import { createTaskList } from '../scripts/task-list.ts'` so
// Vite can tree-shake.

import * as Runtime from './collection-runtime';

export function createTaskList(config) {
    const runtime = Runtime.createCollectionRuntime({
        actions: config.actions,
        buttonSelector: '.sidebar-category',
        cardSelector: config.cardSelector,
        counterId: config.counterId,
        gridId: config.gridId,
        layoutId: config.layoutId,
        searchClearButtonId: config.searchClearButtonId,
        searchInputId: config.searchInputId,
        sidebarId: config.sidebarId,
        storageKey: config.storageKey,
        zoom: {
            eventName: config.zoomEvent
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => runtime.init(), { once: true });
    } else {
        runtime.init();
    }

    return runtime;
}

if (typeof window !== 'undefined') {
    window.JGTaskList = { create: createTaskList };
}
