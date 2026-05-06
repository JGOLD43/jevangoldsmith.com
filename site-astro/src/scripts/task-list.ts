
import * as Runtime from './collection-runtime';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTaskList(config: any): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = runtime as any;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => r.init(), { once: true });
    } else {
        r.init();
    }

    return r;
}
