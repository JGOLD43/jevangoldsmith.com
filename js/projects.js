let currentProjectCategory = 'all';
let currentProjectSearch = '';

function getProjectCards() {
    return Array.from(document.querySelectorAll('.project-card'));
}

function updateProjectView() {
    const query = currentProjectSearch.toLowerCase();
    let visibleCount = 0;

    getProjectCards().forEach((card) => {
        const categories = (card.dataset.category || '').toLowerCase().split(/\s+/);
        const matchesCategory = currentProjectCategory === 'all' || categories.includes(currentProjectCategory);
        const matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);
        const visible = matchesCategory && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
    });

    const counter = document.getElementById('project-count');
    if (counter) counter.textContent = visibleCount;
}

function filterProjects(category, buttonEl) {
    currentProjectCategory = category;

    document.querySelectorAll('.sidebar-category').forEach((button) => {
        button.classList.remove('active');
    });

    if (buttonEl) buttonEl.classList.add('active');
    updateProjectView();
}

function searchProjects(query) {
    currentProjectSearch = query.trim();
    const clearButton = document.getElementById('project-search-clear-btn');
    if (clearButton) clearButton.style.display = currentProjectSearch ? 'flex' : 'none';
    updateProjectView();
}

function clearProjectSearch() {
    currentProjectSearch = '';
    const searchInput = document.getElementById('project-search');
    if (searchInput) searchInput.value = '';
    const clearButton = document.getElementById('project-search-clear-btn');
    if (clearButton) clearButton.style.display = 'none';
    updateProjectView();
}

function toggleProjectSidebar() {
    const layout = document.getElementById('projects-layout');
    const sidebar = document.getElementById('projects-sidebar');
    if (!layout || !sidebar) return;
    layout.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('projects-sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function toggleProjectListDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('list-dropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    });

    updateProjectView();

    const grid = document.getElementById('projects-container');
    if (grid && window.JGGridZoom) {
        grid.classList.add('js-zoom-grid');
        window.JGGridZoom.init({
            grid: grid,
            itemSelector: '.project-card',
            triggerSelector: '.project-card',
            eventName: 'project_open'
        });
    }
});
