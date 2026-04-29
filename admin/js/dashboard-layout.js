// Admin dashboard layout and shell behavior

const sectionTitles = {
    dashboard: 'Dashboard',
    essays: 'Essays',
    adventures: 'Adventures',
    books: 'Books',
    movies: 'Movies',
    music: 'Music',
    podcasts: 'Podcasts',
    products: 'Products',
    people: 'People',
    food: 'Food',
    quotes: 'Quotes',
    projects: 'Projects',
    challenges: 'Challenges',
    skills: 'Skills',
    lessons: 'Lessons',
    photos: 'Photos'
};

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');

    navItems.forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(item.dataset.section);
            closeMobileMenu();
        });
    });
}

function navigateTo(sectionName) {
    window.location.hash = sectionName;

    document.querySelectorAll('.content-section').forEach((section) => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('.nav-item[data-section]').forEach((item) => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });

    const pageTitle = document.getElementById('page-title');
    if (pageTitle && sectionTitles[sectionName]) {
        pageTitle.textContent = sectionTitles[sectionName];
    }
}

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('admin-sidebar');
    if (!mobileMenuBtn || !sidebar) return;

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', closeMobileMenu);
        }

        overlay.classList.toggle('show');
    });
}

function closeMobileMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('show');
}

function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebarToggle || !sidebar) return;

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }
}

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) logout();
    });
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.admin-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <span>${escapeHTML(message)}</span>
        <button data-admin-action="dismiss-notification">&times;</button>
    `;

    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .admin-notification {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: var(--admin-primary);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            .admin-notification.success {
                background: var(--admin-success);
            }
            .admin-notification.error {
                background: var(--admin-danger);
            }
            .admin-notification button {
                background: transparent;
                border: none;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
                padding: 0;
                opacity: 0.8;
            }
            .admin-notification button:hover {
                opacity: 1;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function debounce(func, wait) {
    let timeout;
    return function debounced(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
