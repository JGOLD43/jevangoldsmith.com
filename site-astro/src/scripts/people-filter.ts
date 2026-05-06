let peopleSourceFilter = 'all';

function sourceMatches(card: HTMLElement) {
    return peopleSourceFilter === 'all' || card.dataset.sourceType === peopleSourceFilter;
}

function updatePeopleSourceButtons() {
    document.querySelectorAll<HTMLElement>('.people-source-filter-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.actionArgs === peopleSourceFilter);
    });
}

function setText(id: string, value: unknown) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
}

function updatePeopleFilterCounts(allCards: HTMLElement[]) {
    const sourceCards = peopleSourceFilter === 'all'
        ? allCards
        : allCards.filter((card) => card.dataset.sourceType === peopleSourceFilter);
    const sourceCounts = allCards.reduce<Record<string, number>>((counts, card) => {
        const source = card.dataset.sourceType || 'nonfiction';
        counts[source] = (counts[source] || 0) + 1;
        return counts;
    }, { fiction: 0, nonfiction: 0 });
    const categoryCounts = sourceCards.reduce<Record<string, number>>((counts, card) => {
        const category = card.dataset.category || '';
        counts[category] = (counts[category] || 0) + 1;
        return counts;
    }, {});

    setText('people-source-count-all', allCards.length);
    setText('people-source-count-nonfiction', sourceCounts.nonfiction || 0);
    setText('people-source-count-fiction', sourceCounts.fiction || 0);
    setText('count-people-all', sourceCards.length);
    ['business', 'writers', 'science', 'creators'].forEach((category) => {
        setText(`count-people-${category}`, categoryCounts[category] || 0);
    });
}

export function applyPeopleSourceFilter({ allCards, visibleCards }: { allCards: HTMLElement[]; visibleCards: HTMLElement[] }) {
    const categorySearchVisible = new Set(visibleCards);
    const finalVisible: HTMLElement[] = [];
    allCards.forEach((card) => {
        const visible = categorySearchVisible.has(card) && sourceMatches(card);
        card.style.display = visible ? 'block' : 'none';
        if (visible) finalVisible.push(card);
    });
    setText('people-count', finalVisible.length);
    updatePeopleFilterCounts(allCards);
    updatePeopleSourceButtons();
}

export function registerPeopleFilterActions(getRuntime: () => AnyObj) {
    window.JGActions?.register({
        filterPeopleSource(source: string, event?: Event) {
            peopleSourceFilter = source || 'all';
            const button = (event?.target as Element | undefined)?.closest('.people-source-filter-btn');
            if (button) {
                document.querySelectorAll('.people-source-filter-btn').forEach((item) => item.classList.remove('active'));
                button.classList.add('active');
            }
            getRuntime()?.render();
        }
    });
}
