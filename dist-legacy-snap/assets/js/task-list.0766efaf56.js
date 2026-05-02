(function () {
    function create(config) {
        const runtime = window.JGCollectionRuntime.create({
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

        document.addEventListener('DOMContentLoaded', () => {
            runtime.init();
        });

        return runtime;
    }

    window.JGTaskList = { create };
}());
