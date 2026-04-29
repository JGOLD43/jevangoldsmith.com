(function () {
    const CATEGORY_MAP = {
        'Advertising and Copywriting': 'advertising',
        'Autobiographies': 'autobiographies',
        'Big Ideas': 'bigideas',
        'Learning': 'learning',
        'Out of the Box Thinking': 'outofthebox',
        'Patience and Clear Thinking': 'patience',
        'Persuasion': 'persuasion',
        'Psychology Books': 'psychology',
        'Science': 'science',
        'Storytelling': 'storytelling',
        'Strategy and War': 'strategy',
        'The Great Books': 'greatbooks',
        'Who Am I?': 'whoami'
    };

    const CATEGORY_NAME_BY_KEY = Object.entries(CATEGORY_MAP).reduce((lookup, [name, key]) => {
        lookup[key] = name;
        return lookup;
    }, {});

    function filterBooks(books, state) {
        const query = String(state.searchQuery || '').toLowerCase();

        return books.filter((book) => {
            if (query) {
                const matchesQuery = [
                    book.title,
                    book.author,
                    book.category || ''
                ].some((value) => String(value).toLowerCase().includes(query));

                if (!matchesQuery) {
                    return false;
                }
            }

            if (state.starFilter !== 'all' && Number(book.rating) < Number(state.starFilter)) {
                return false;
            }

            if (state.reReadsFilter !== 'all' && Number(book.reReads || 0) < Number(state.reReadsFilter)) {
                return false;
            }

            return true;
        });
    }

    function getCategoryKey(categoryName) {
        return CATEGORY_MAP[categoryName] || null;
    }

    function getCategoryName(categoryKey) {
        return CATEGORY_NAME_BY_KEY[categoryKey] || null;
    }

    function getBooksForCategory(books, categoryKey) {
        if (categoryKey === 'all') {
            return books;
        }

        const categoryName = getCategoryName(categoryKey);
        if (!categoryName) {
            return [];
        }

        return books.filter((book) => book.category === categoryName);
    }

    function groupBooksByCategory(books) {
        const groups = Object.values(CATEGORY_MAP).reduce((memo, key) => {
            memo[key] = [];
            return memo;
        }, {});

        books.forEach((book) => {
            const categoryKey = getCategoryKey(book.category);
            if (categoryKey && groups[categoryKey]) {
                groups[categoryKey].push(book);
            }
        });

        return groups;
    }

    window.JGBooksFilters = {
        CATEGORY_MAP,
        filterBooks,
        getBooksForCategory,
        getCategoryName,
        groupBooksByCategory
    };
}());
