// Phase 3 slice 3.1: named ES export. The legacy `window.JGTaskList`
// global stays exposed as a backwards-compat shim, but consumers should
// use `import { createTaskList } from '../scripts/task-list.js'` so
// Vite can tree-shake.

import * as Runtime from './collection-runtime.js';

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
