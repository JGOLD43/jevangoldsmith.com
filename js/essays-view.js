(function () {
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function createEssayArticle(essay) {
        const article = document.createElement('article');
        article.className = 'article-full';
        article.id = essay.id;
        article.innerHTML = `
            <div class="post-meta">
                <span class="post-date">${escapeHTML(formatDate(essay.date))}</span>
                <span class="post-category">${escapeHTML(essay.category)}</span>
            </div>
            <h2>${escapeHTML(essay.title)}</h2>
            ${essay.subtitle ? `<p><em>${escapeHTML(essay.subtitle)}</em></p>` : ''}
            ${sanitizeHTML(essay.content)}
        `;
        return article;
    }

    function createEssayNav(filteredEssays, currentIndex) {
        const nav = document.createElement('div');
        nav.className = 'essay-nav';
        const total = filteredEssays.length;
        const atStart = currentIndex <= 0;
        const atEnd = currentIndex >= total - 1;
        const prevTitle = !atStart ? filteredEssays[currentIndex - 1].title : '';
        const nextTitle = !atEnd ? filteredEssays[currentIndex + 1].title : '';

        nav.innerHTML = `
            <button class="essay-nav-btn essay-nav-prev" ${atStart ? 'disabled' : ''} data-action="prevEssay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span class="essay-nav-label">
                    <span class="essay-nav-direction">Previous</span>
                    ${prevTitle ? `<span class="essay-nav-title">${escapeHTML(prevTitle)}</span>` : ''}
                </span>
            </button>
            <span class="essay-nav-counter">${currentIndex + 1} / ${total}</span>
            <button class="essay-nav-btn essay-nav-next" ${atEnd ? 'disabled' : ''} data-action="nextEssay">
                <span class="essay-nav-label essay-nav-label-right">
                    <span class="essay-nav-direction">Next</span>
                    ${nextTitle ? `<span class="essay-nav-title">${escapeHTML(nextTitle)}</span>` : ''}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        `;
        return nav;
    }

    function renderCurrentEssay(filteredEssays, currentIndex) {
        const container = document.getElementById('essays-container');
        if (!container) return;

        container.innerHTML = '';

        if (!filteredEssays.length) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">No essays published yet.</p>';
            return;
        }

        const essay = filteredEssays[currentIndex];
        container.appendChild(createEssayArticle(essay));
        container.appendChild(createEssayNav(filteredEssays, currentIndex));
        updateActiveSidebarLink(essay.id);
    }

    function renderSidebar(groups) {
        const countAll = document.getElementById('count-all');
        if (countAll) {
            const total = Object.values(groups).reduce((sum, essays) => sum + essays.length, 0);
            countAll.textContent = total;
        }

        Object.keys(groups).forEach((category) => {
            const essays = groups[category];
            const countEl = document.getElementById(`count-${category}`);
            const section = countEl?.closest('.sidebar-section');
            const container = document.getElementById(`category-${category}`);

            if (countEl) {
                countEl.textContent = essays.length;
            }

            if (section) {
                section.style.display = essays.length === 0 ? 'none' : 'block';
            }

            if (container) {
                container.innerHTML = essays.map((essay) => `
                    <a href="#${escapeAttr(essay.id)}" class="essay-link" data-action="scrollToEssay" data-action-args="${encodeURIComponent(essay.id)}" data-action-eventobj="true">
                        <div>${escapeHTML(essay.title)}</div>
                        <div class="essay-link-date">${escapeHTML(formatDateShort(essay.date))}</div>
                    </a>
                `).join('');
            }
        });
    }

    function updateActiveSidebarLink(essayId) {
        document.querySelectorAll('.essay-link').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${essayId}`);
        });
    }

    function updateEssayCount(count) {
        const countEl = document.getElementById('essay-count');
        if (countEl) {
            countEl.textContent = count;
        }
    }

    function showErrorMessage() {
        const container = document.getElementById('essays-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <p style="color: var(--accent-color); font-size: 1.2rem; margin-bottom: 1rem;">Unable to load essays</p>
                <p style="color: var(--text-light);">Please try refreshing the page.</p>
            </div>
        `;
    }

    function scrollToTop() {
        const main = document.querySelector('.essays-main');
        if (main) {
            main.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.JGEssaysView = {
        renderCurrentEssay,
        renderSidebar,
        scrollToTop,
        showErrorMessage,
        updateEssayCount
    };
}());
