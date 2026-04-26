let currentChallengeCategory = 'all';
let currentChallengeSearch = '';

function getChallengeCards() {
    return Array.from(document.querySelectorAll('.challenge-card'));
}

function updateChallengeView() {
    const query = currentChallengeSearch.toLowerCase();
    let visibleCount = 0;

    getChallengeCards().forEach((card) => {
        const categories = (card.dataset.category || '').toLowerCase().split(/\s+/);
        const matchesCategory = currentChallengeCategory === 'all' || categories.includes(currentChallengeCategory);
        const matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);
        const visible = matchesCategory && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
    });

    const counter = document.getElementById('challenge-count');
    if (counter) counter.textContent = visibleCount;
}

function filterChallenges(category, buttonEl) {
    currentChallengeCategory = category;

    document.querySelectorAll('.sidebar-category').forEach((button) => {
        button.classList.remove('active');
    });

    if (buttonEl) buttonEl.classList.add('active');
    updateChallengeView();
}

function searchChallenges(query) {
    currentChallengeSearch = query.trim();
    const clearButton = document.getElementById('challenge-search-clear-btn');
    if (clearButton) clearButton.style.display = currentChallengeSearch ? 'flex' : 'none';
    updateChallengeView();
}

function clearChallengeSearch() {
    currentChallengeSearch = '';
    const searchInput = document.getElementById('challenge-search');
    if (searchInput) searchInput.value = '';
    const clearButton = document.getElementById('challenge-search-clear-btn');
    if (clearButton) clearButton.style.display = 'none';
    updateChallengeView();
}

function toggleChallengeSidebar() {
    const layout = document.getElementById('challenges-layout');
    const sidebar = document.getElementById('challenges-sidebar');
    if (!layout || !sidebar) return;
    layout.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('challenges-sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function toggleChallengeListDropdown() {
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

    const buttons = document.querySelectorAll('.sidebar-category[data-tooltip]');
    buttons.forEach((btn) => {
        const label = btn.getAttribute('data-tooltip') || '';
        const map = {
            'All Challenges': 'all',
            'Active': 'active',
            'Upcoming': 'upcoming',
            'Completed': 'completed',
            'Learning': 'learning',
            'Fitness': 'fitness',
            'Creative': 'creative',
            'Financial': 'financial'
        };
        const cat = map[label];
        if (cat) btn.dataset.actionArgs = cat;
    });

    updateChallengeView();

    const grid = document.getElementById('challenges-container');
    if (grid && window.JGGridZoom) {
        grid.classList.add('js-zoom-grid');
        window.JGGridZoom.init({
            grid: grid,
            itemSelector: '.challenge-card',
            triggerSelector: '.challenge-card',
            eventName: 'challenge_open'
        });
    }
});
