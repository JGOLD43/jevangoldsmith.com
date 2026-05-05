// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.

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
