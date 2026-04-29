(function () {
    const CATEGORY_KEYS = ['philosophy', 'management', 'technology', 'personal', 'finance', 'writing'];

    function filterByCategory(essays, category) {
        if (category === 'all') {
            return essays;
        }
        return essays.filter((essay) => String(essay.category || '').toLowerCase() === category);
    }

    function filterBySearch(essays, term) {
        const normalized = String(term || '').trim().toLowerCase();
        if (!normalized) {
            return essays;
        }

        return essays.filter((essay) => {
            const searchable = [
                essay.title,
                essay.subtitle || '',
                essay.category,
                essay.content || ''
            ].join(' ').toLowerCase();

            return searchable.includes(normalized);
        });
    }

    function groupByCategory(essays) {
        const groups = CATEGORY_KEYS.reduce((memo, key) => {
            memo[key] = [];
            return memo;
        }, {});

        essays.forEach((essay) => {
            const key = String(essay.category || '').toLowerCase();
            if (groups[key]) {
                groups[key].push(essay);
            }
        });

        return groups;
    }

    function findEssayIndex(essays, essayId) {
        return essays.findIndex((essay) => essay.id === essayId);
    }

    window.JGEssaysFilters = {
        filterByCategory,
        filterBySearch,
        findEssayIndex,
        groupByCategory
    };
}());
