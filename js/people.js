const dataFetch = window.JGDataFetch;

let peopleCards = [];
let peopleRuntime = null;
let peopleById = new Map();
let lastFocusedPerson = null;

const BOOK_PEOPLE = {
    'A Few Lessons for Investors and Managers from Warren Buffett': ['Warren Buffett'],
    'A Few Lessons from Sherlock Holmes': ['Sherlock Holmes'],
    'All I Want to Know is Where I\'m Going to Die So I\'ll Never Go There': ['Charlie Munger'],
    'Atomic Habits': ['James Clear'],
    'Berkshire Hathaway Letters to Shareholders 1965-2023': ['Warren Buffett'],
    'Bird by Bird': ['Anne Lamott'],
    'Can\'t Hurt Me': ['David Goggins'],
    'Confessions of an Advertising Man': ['David Ogilvy'],
    'Damn Right!: Behind the Scenes with Berkshire Hathaway Billionaire Charlie Munger': ['Charlie Munger'],
    'Deep Work': ['Cal Newport'],
    'How to Write a Good Advertisement': ['Victor O. Schwab'],
    'Influence': ['Robert Cialdini'],
    'Letters from John D. Rockefeller to His Son': ['John D. Rockefeller'],
    'Never Enough': ['Andrew Wilkinson'],
    'Ogilvy on Advertising': ['David Ogilvy'],
    'Poor Charlie\'s Almanack': ['Charlie Munger'],
    'Principles': ['Ray Dalio'],
    'Random Reminiscences of Men and Events': ['John D. Rockefeller'],
    'Seeking Wisdom: From Darwin to Munger': ['Charlie Munger'],
    'Surely You\'re Joking, Mr. Feynman!': ['Richard Feynman'],
    'Tao of Charlie Munger': ['Charlie Munger'],
    'The Almanack of Naval Ravikant': ['Naval Ravikant'],
    'The Art of Worldly Wisdom': ['Baltasar Gracián'],
    'The Checklist Manifesto': ['Atul Gawande'],
    'The Great Mental Models': ['Shane Parrish'],
    'The Great Mental Models Volume 1: General Thinking Concepts': ['Shane Parrish'],
    'The Lean Startup': ['Eric Ries'],
    'The Mom Test': ['Rob Fitzpatrick'],
    'The Power of Now': ['Eckhart Tolle'],
    'The Road Less Stupid': ['Keith J. Cunningham'],
    'The Snowball: Warren Buffett and the Business of Life': ['Warren Buffett'],
    'The Ultimate Blueprint for an Insanely Successful Business': ['Keith J. Cunningham'],
    'Titan: The Life of John D. Rockefeller, Sr.': ['John D. Rockefeller'],
    'Zero to One': ['Peter Thiel']
};

const GENERATED_PERSON_META = {
    'Andrew Wilkinson': {
        category: 'business',
        lesson: 'Build patiently, own what lasts',
        title: 'Entrepreneur, Investor'
    },
    'Anne Lamott': {
        category: 'writers',
        lesson: 'Write one honest sentence at a time',
        title: 'Writer'
    },
    'Atul Gawande': {
        category: 'science',
        lesson: 'Complex work needs simple checks',
        title: 'Surgeon, Writer'
    },
    'Baltasar Gracián': {
        category: 'writers',
        lesson: 'Wisdom is precision under pressure',
        title: 'Philosopher, Writer'
    },
    'Cal Newport': {
        category: 'writers',
        lesson: 'Protect the depth that compounds',
        title: 'Writer, Computer Scientist'
    },
    'Charlie Munger': {
        category: 'business',
        lesson: 'Collect models, avoid stupidity',
        title: 'Investor, Berkshire Hathaway'
    },
    'David Goggins': {
        category: 'athletes',
        lesson: 'Expand the standard you answer to',
        title: 'Endurance Athlete, Author'
    },
    'David Ogilvy': {
        category: 'creators',
        lesson: 'Sell with research and clarity',
        title: 'Advertising Executive'
    },
    'Eckhart Tolle': {
        category: 'writers',
        lesson: 'Return attention to the present',
        title: 'Spiritual Teacher'
    },
    'Eric Ries': {
        category: 'business',
        lesson: 'Validate before you scale',
        title: 'Entrepreneur, Author'
    },
    'John D. Rockefeller': {
        category: 'business',
        lesson: 'Systemize the machine, then improve it',
        title: 'Founder, Standard Oil'
    },
    'Keith J. Cunningham': {
        category: 'business',
        lesson: 'Think clearly before acting quickly',
        title: 'Entrepreneur, Business Teacher'
    },
    'Peter Thiel': {
        category: 'business',
        lesson: 'Compete by escaping competition',
        title: 'Entrepreneur, Investor'
    },
    'Rob Fitzpatrick': {
        category: 'business',
        lesson: 'Ask questions reality can answer',
        title: 'Entrepreneur, Author'
    },
    'Robert Cialdini': {
        category: 'science',
        lesson: 'Influence follows predictable triggers',
        title: 'Psychologist, Author'
    },
    'Shane Parrish': {
        category: 'writers',
        lesson: 'Make better decisions with better models',
        title: 'Writer, Mental Models Teacher'
    },
    'Sherlock Holmes': {
        category: 'creators',
        lesson: 'Observe before you infer',
        title: 'Fictional Detective'
    },
    'Victor O. Schwab': {
        category: 'creators',
        lesson: 'Lead with the reader\'s desire',
        title: 'Copywriter'
    }
};

const PERSON_BIOS = {
    'Andrew Wilkinson': 'Andrew Wilkinson is the co-founder of Tiny, a holding company built around buying, operating, and compounding simple internet businesses.',
    'Anne Lamott': 'Anne Lamott is an American novelist and writing teacher whose work is known for its honesty, humor, faith, and practical creative guidance.',
    'Andrew Huberman': 'Andrew Huberman is a Stanford neuroscientist and educator known for making neuroscience, physiology, and behavioral tools useful to a broad audience.',
    'Atul Gawande': 'Atul Gawande is a surgeon, writer, and public health thinker who studies how professionals make complex systems safer and more reliable.',
    'Baltasar Gracián': 'Baltasar Gracián was a Spanish Jesuit philosopher and writer whose aphorisms compress practical wisdom about judgment, reputation, and power.',
    'Cal Newport': 'Cal Newport is a computer science professor and author focused on deep work, attention, skill-building, and the discipline required for meaningful output.',
    'Charlie Munger': 'Charlie Munger was Warren Buffett\'s longtime partner at Berkshire Hathaway and a relentless advocate for multidisciplinary thinking, incentives, and avoiding obvious stupidity.',
    'Christopher Nolan': 'Christopher Nolan is a filmmaker known for large-scale, structurally ambitious movies built around time, memory, obsession, and moral pressure.',
    'David Goggins': 'David Goggins is an endurance athlete and former Navy SEAL known for his extreme mental toughness and self-discipline philosophy.',
    'David Ogilvy': 'David Ogilvy was a legendary advertising executive who helped define modern direct-response and brand advertising through research, clarity, and craft.',
    'Eckhart Tolle': 'Eckhart Tolle is a spiritual teacher and author whose work centers on presence, attention, and loosening identification with thought.',
    'Elon Musk': 'Elon Musk is an entrepreneur and engineer associated with Tesla, SpaceX, and other companies pushing aggressive technology and manufacturing frontiers.',
    'Eric Ries': 'Eric Ries is an entrepreneur and author best known for the Lean Startup method: rapid experimentation, validated learning, and disciplined product iteration.',
    'James Clear': 'James Clear is an author and habits thinker whose work turns behavior change into simple, repeatable systems.',
    'John D. Rockefeller': 'John D. Rockefeller built Standard Oil into one of history\'s most powerful companies and became a defining figure in American business, monopoly, and philanthropy.',
    'Keith J. Cunningham': 'Keith J. Cunningham is an entrepreneur and business teacher focused on judgment, financial discipline, and asking better questions before acting.',
    'Lex Fridman': 'Lex Fridman is an AI researcher and long-form interviewer known for conversations about technology, science, philosophy, and human nature.',
    'Morgan Housel': 'Morgan Housel is a writer and investor known for explaining money, risk, behavior, and long-term decision-making through clear stories.',
    'Naval Ravikant': 'Naval Ravikant is an entrepreneur, investor, and thinker known for compact ideas about leverage, judgment, wealth, happiness, and independence.',
    'Peter Thiel': 'Peter Thiel is an entrepreneur and investor known for PayPal, Palantir, Founders Fund, and contrarian ideas about monopoly and startups.',
    'Ray Dalio': 'Ray Dalio founded Bridgewater Associates and is known for principles-based management, macro investing, and systematic decision-making.',
    'Richard Feynman': 'Richard Feynman was a Nobel Prize-winning physicist celebrated for curiosity, clear explanation, playful problem-solving, and scientific honesty.',
    'Rick Rubin': 'Rick Rubin is a music producer known for stripping work down to its essence and helping artists find what feels true.',
    'Rob Fitzpatrick': 'Rob Fitzpatrick is an entrepreneur and author who teaches practical customer discovery and how to ask questions that reveal reality.',
    'Robert Cialdini': 'Robert Cialdini is a psychologist whose research on persuasion and social influence shaped how people understand compliance, trust, and decision triggers.',
    'Ryan Holiday': 'Ryan Holiday is a writer and media strategist who popularized modern Stoicism through books about discipline, resilience, ego, and action.',
    'Shane Parrish': 'Shane Parrish is the founder of Farnam Street and a writer focused on mental models, decision-making, and practical wisdom.',
    'Sherlock Holmes': 'Sherlock Holmes is Arthur Conan Doyle\'s fictional detective and a durable symbol of observation, inference, and disciplined attention.',
    'Victor O. Schwab': 'Victor O. Schwab was a direct-response copywriter whose advertising work emphasized reader desire, specific promises, and clear selling.',
    'Warren Buffett': 'Warren Buffett is the chairman of Berkshire Hathaway and one of the most influential investors in history, known for patience, temperament, and business quality.'
};

function normalizePersonName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generatedImageForPerson(name) {
    const slug = normalizePersonName(name);
    return {
        image: `images/generated/people/${slug}-400.jpg`,
        srcset: [
            `images/generated/people/${slug}-200.jpg 200w`,
            `images/generated/people/${slug}-400.jpg 400w`,
            `images/generated/people/${slug}-800.jpg 800w`
        ].join(', ')
    };
}

function bookLabel(book) {
    const year = book.year || book.published || book.readYear;
    return year ? `${book.title} (${year})` : book.title;
}

function attachBook(person, book) {
    if (!person.books) person.books = [];
    const label = bookLabel(book);
    if (!person.books.some((entry) => entry.title === book.title)) {
        person.books.push({
            author: book.author || '',
            coverImage: book.coverImageMedium || book.coverImage || '',
            href: `books.html?book=${encodeURIComponent(book.title)}`,
            label,
            title: book.title
        });
    }
}

function profileForName(profiles, name) {
    const id = normalizePersonName(name);
    return profiles.find((profile) => profile.id === id || profile.name === name) || null;
}

function mergeBookPeople(people, books, profiles = []) {
    const byName = new Map();
    people.forEach((person) => {
        const profile = profileForName(profiles, person.name);
        byName.set(person.name, {
            ...person,
            bio: profile?.bio || PERSON_BIOS[person.name] || person.lesson || '',
            profileHref: profile ? `people/${profile.id}.html` : '',
            thesis: profile?.thesis || person.lesson || '',
            books: []
        });
    });

    books.forEach((book) => {
        const subjects = BOOK_PEOPLE[book.title];
        if (!subjects) return;

        subjects.forEach((name) => {
            const existing = byName.get(name);
            const meta = GENERATED_PERSON_META[name] || {};
            const profile = profileForName(profiles, name);
            const imageMeta = generatedImageForPerson(name);
            const person = existing || {
                bio: profile?.bio || meta.bio || PERSON_BIOS[name] || '',
                category: meta.category || 'writers',
                image: imageMeta.image,
                lesson: meta.lesson || 'Learn from the life behind the work',
                name,
                profileHref: profile ? `people/${profile.id}.html` : '',
                srcset: imageMeta.srcset,
                thesis: profile?.thesis || meta.lesson || '',
                title: meta.title || 'Subject'
            };

            byName.set(name, {
                ...person,
                ...meta,
                bio: person.bio || profile?.bio || meta.bio || PERSON_BIOS[name] || '',
                image: person.image || imageMeta.image,
                profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
                srcset: person.srcset || imageMeta.srcset,
                thesis: person.thesis || profile?.thesis || meta.lesson || ''
            });
            attachBook(byName.get(name), book);
        });
    });

    return Array.from(byName.values())
        .map((person) => ({
            ...person,
            bio: person.bio || PERSON_BIOS[person.name] || person.lesson || '',
            books: person.books || [],
            searchText: [
                person.name,
                person.title,
                person.lesson,
                ...(person.books || []).map((book) => book.label)
            ].join(' ')
        }))
        .sort((a, b) => (b.books.length - a.books.length) || a.name.localeCompare(b.name));
}

function createPersonCard(person) {
    const article = document.createElement('article');
    article.className = 'person-card';
    article.dataset.category = person.category || '';
    article.dataset.personId = normalizePersonName(person.name);
    article.dataset.search = person.searchText || `${person.name} ${person.title} ${person.lesson}`;
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.innerHTML = `
        <div class="person-image-container">
            <img src="${escapeAttr(person.image)}" alt="${escapeAttr(person.name)}" class="person-image" srcset="${escapeAttr(person.srcset || '')}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" loading="lazy" decoding="async">
        </div>
        <div class="person-info">
            <h3 class="person-name">${escapeHTML(person.name)}</h3>
            <p class="person-title">${escapeHTML(person.title)}</p>
            <p class="person-lesson">${escapeHTML(person.lesson)}</p>
        </div>
    `;
    return article;
}

function buildPeopleRecords(people) {
    return people.map((person) => ({
        category: person.category || '',
        card: createPersonCard(person),
        searchText: String(person.searchText || `${person.name} ${person.title} ${person.lesson}`).toLowerCase()
    }));
}

async function loadPeopleCards() {
    const [data, booksData, profilesData] = await Promise.all([
        dataFetch.fetchJson('data/people.json'),
        dataFetch.fetchJsonWithFallback(['data/books.generated.json', 'data/books.json']),
        dataFetch.fetchJson('data/people.profiles.json').catch(() => ({ profiles: [] }))
    ]);
    const people = Array.isArray(data.people) ? data.people : [];
    const books = Array.isArray(booksData) ? booksData : booksData.books || [];
    const profiles = Array.isArray(profilesData.profiles) ? profilesData.profiles : [];
    const grid = document.getElementById('people-grid');
    if (grid) {
        const fragment = document.createDocumentFragment();
        const mergedPeople = mergeBookPeople(people, books, profiles);
        peopleById = new Map(mergedPeople.map((person) => [normalizePersonName(person.name), person]));
        peopleCards = buildPeopleRecords(mergedPeople);
        peopleCards.forEach(({ card }) => fragment.appendChild(card));
        grid.innerHTML = '';
        grid.appendChild(fragment);
    }
}

function createBooksMarkup(person) {
    if (!person.books?.length) return '';
    return `
        <div class="person-detail-books">
            <p class="person-detail-section-label">Books</p>
            <div class="person-detail-book-list">
                ${person.books.map((book) => `
                    <a class="person-detail-book-link" href="${escapeAttr(book.href)}">
                        ${book.coverImage ? `<img class="person-detail-book-cover" src="${escapeAttr(book.coverImage)}" alt="${escapeAttr(book.title)} cover" loading="lazy" decoding="async">` : '<span class="person-detail-book-cover person-detail-book-cover-fallback" aria-hidden="true"></span>'}
                        <span class="person-detail-book-meta">
                            <span class="person-detail-book-title">${escapeHTML(book.label)}</span>
                            ${book.author ? `<span class="person-detail-book-author">${escapeHTML(book.author)}</span>` : ''}
                        </span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

function ensurePeopleDetailModal() {
    let modal = document.getElementById('person-detail-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'person-detail-modal';
    modal.className = 'person-detail-modal';
    modal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(modal);
    return modal;
}

function closePeopleDetail() {
    const modal = document.getElementById('person-detail-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('person-detail-open');
    lastFocusedPerson?.focus();
    lastFocusedPerson = null;
}

function openPeopleDetail(person, trigger) {
    const modal = ensurePeopleDetailModal();
    lastFocusedPerson = trigger || document.activeElement;
    modal.innerHTML = `
        <div class="person-detail-backdrop" data-action="close-person-detail"></div>
        <article class="person-detail-panel" role="dialog" aria-modal="true" aria-labelledby="person-detail-title">
            <button class="person-detail-close" type="button" data-action="close-person-detail" aria-label="Close person detail">X</button>
            <div class="person-detail-hero">
                <div class="person-detail-image-wrap">
                    <img src="${escapeAttr(person.image)}" alt="${escapeAttr(person.name)}" class="person-detail-image" srcset="${escapeAttr(person.srcset || '')}" sizes="(max-width: 768px) 78vw, 320px" width="400" height="400">
                </div>
                <div class="person-detail-copy">
                    <p class="person-detail-kicker">${escapeHTML(person.title)}</p>
                    <h2 id="person-detail-title">${escapeHTML(person.name)}</h2>
                    <p class="person-detail-bio">${escapeHTML(person.bio || person.lesson)}</p>
                    <p class="person-detail-blurb">${escapeHTML(person.lesson)}</p>
                    ${person.profileHref ? `<a class="person-detail-profile-link" href="${escapeAttr(person.profileHref)}">View profile</a>` : ''}
                </div>
            </div>
            ${createBooksMarkup(person)}
        </article>
    `;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('person-detail-open');
    modal.querySelector('.person-detail-close')?.focus();
}

function initPeopleDetail() {
    const grid = document.querySelector('.people-grid');
    if (!grid) return;

    grid.addEventListener('click', (event) => {
        const card = event.target.closest('.person-card');
        if (!card) return;
        const person = peopleById.get(card.dataset.personId || '');
        if (!person) return;
        openPeopleDetail(person, card);
    });

    grid.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('.person-card');
        if (!card) return;
        event.preventDefault();
        const person = peopleById.get(card.dataset.personId || '');
        if (person) openPeopleDetail(person, card);
    });

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="close-person-detail"]')) closePeopleDetail();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closePeopleDetail();
    });
}

async function initPeoplePage() {
    peopleRuntime = window.JGCollectionRuntime.create({
        actions: {
            clearSearch: 'clearPeopleSearch',
            filter: 'filterByCategory',
            search: 'filterPeople',
            toggleSidebar: 'togglePeopleSidebar'
        },
        allButtonSelector: '[data-action="filterByCategory"][data-action-args="all"]',
        buttonSelector: '.sidebar-category',
        cardSelector: '.person-card',
        categoryMode: 'exact',
        counterId: 'people-count',
        layoutId: 'people-layout',
        searchClearButtonId: 'people-search-clear-btn',
        searchClearDisplay: 'block',
        searchInputId: 'people-search',
        sidebarId: 'people-sidebar',
        storageKey: 'people-sidebar-collapsed',
        useDisplayStyle: true
    });
    await loadPeopleCards();
    peopleRuntime.init();
    initPeopleDetail();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPeoplePage().catch((error) => console.error('Error loading people:', error));
    });
} else {
    initPeoplePage().catch((error) => console.error('Error loading people:', error));
}
