// Admin dashboard bootstrap and event delegation

function initAdminActions() {
    document.addEventListener('click', (event) => {
        const control = event.target.closest('[data-admin-action]');
        if (!control) return;

        const action = control.dataset.adminAction;
        const actionHandlers = {
            navigate: () => navigateTo(control.dataset.sectionTarget),
            'show-add-form': () => showAddForm(control.dataset.contentType),
            'toggle-book-import': () => toggleImportPanel(),
            'clear-book-import': () => clearImport(),
            'download-book-template': () => downloadTemplate(),
            'apply-book-import': () => applyImport(),
            'download-books-json': () => downloadBooksJSON(),
            'copy-books-json': () => copyBooksJSON(event),
            'toggle-essay-import': () => toggleEssayImportPanel(),
            'clear-essay-import': () => clearEssayImport(),
            'download-essay-template': () => downloadEssayTemplate(),
            'apply-essay-import': () => applyEssayImport(),
            'download-essays-json': () => downloadEssaysJSON(),
            'copy-essays-json': () => copyEssaysJSON(),
            'generate-totp-secret': () => generateTOTPSecret(),
            'copy-generated-secret': () => copyToClipboard(document.getElementById('generated-secret')?.textContent || '', 'Secret key copied!'),
            'show-setup-step': () => showSetupStep(Number(control.dataset.step)),
            'finish-twofa-setup': () => finishTwoFASetup(),
            'show-reconfigure-warning': () => showReconfigureWarning(),
            'logout-direct': () => logout(),
            'close-modal': () => closeModal(),
            'edit-book': () => editBook(control.dataset.isbn),
            'edit-content': () => editContent(control.dataset.contentType, control.dataset.itemId),
            'delete-content': () => deleteContent(control.dataset.contentType, control.dataset.itemId),
            'dismiss-notification': () => control.closest('.admin-notification')?.remove(),
            'open-photo-input': () => document.getElementById('photo-input')?.click()
        };

        const handler = actionHandlers[action];
        if (!handler) return;
        event.preventDefault();
        handler();
    });

    document.addEventListener('change', (event) => {
        const control = event.target.closest('[data-admin-action]');
        if (!control) return;
        if (control.dataset.adminAction === 'book-file-select') handleFileSelect(event);
        if (control.dataset.adminAction === 'essay-file-select') handleEssayFileSelect(event);
    });

    document.addEventListener('submit', (event) => {
        const form = event.target.closest('[data-admin-form]');
        if (!form) return;

        if (form.dataset.adminForm === 'verify-setup') {
            verifySetupCode(event);
            return;
        }

        const contentType = form.dataset.contentType;
        if (contentType) handleFormSubmit(event, contentType);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileMenu();
    initSidebarToggle();
    initLogout();
    initModalClose();
    initAdminActions();
    initDashboardFilters();
    loadBooksFromData();
    updateStats();

    const hash = window.location.hash.slice(1);
    if (hash && sectionTitles[hash]) {
        navigateTo(hash);
    }
});
