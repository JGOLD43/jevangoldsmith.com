function filterByCategory(category) {
    const buttons = document.querySelectorAll('.sidebar-category');
    buttons.forEach((button) => button.classList.remove('active'));
    const clickEvent = window.event;
    if (clickEvent?.target) clickEvent.target.closest('.sidebar-category')?.classList.add('active');

    const cards = document.querySelectorAll('.person-card');
    cards.forEach((card) => {
        card.style.display = category === 'all' || card.dataset.category === category ? 'block' : 'none';
    });
}

function filterPeople(searchTerm) {
    const term = searchTerm.toLowerCase();
    const cards = document.querySelectorAll('.person-card');
    cards.forEach((card) => {
        const name = card.querySelector('.person-name')?.textContent.toLowerCase() || '';
        const title = card.querySelector('.person-title')?.textContent.toLowerCase() || '';
        card.style.display = name.includes(term) || title.includes(term) ? 'block' : 'none';
    });
}

function togglePeopleSidebar() {
    const layout = document.getElementById('people-layout');
    const sidebar = document.getElementById('people-sidebar');
    layout?.classList.toggle('sidebar-collapsed');
    sidebar?.classList.toggle('collapsed');
}

function initPeopleZoom() {
    const grid = document.querySelector('.people-grid');
    if (!grid || !window.JGGridZoom) return;
    grid.classList.add('js-zoom-grid');
    document.querySelectorAll('.person-card').forEach((card) => {
        card.classList.add('js-zoom-item');
        card.tabIndex = 0;
    });
    window.JGGridZoom.init({
        grid,
        itemSelector: '.person-card',
        triggerSelector: '.person-card',
        anchorSelector: '.person-image-container',
        eventName: 'people_card_open'
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPeopleZoom);
} else {
    initPeopleZoom();
}
