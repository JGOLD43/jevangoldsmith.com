import { escapeHtml as escapeHTML, escapeAttr } from '../lib/html-escape';

let lastFocusedPerson: HTMLElement | null = null;

function createMediaMarkup(person: AnyObj, key: string, label: string) {
    const entries = person[key] || [];
    if (!entries.length) return '';
    return `
        <div class="person-detail-books">
            <p class="person-detail-section-label">${escapeHTML(label)}</p>
            <div class="person-detail-book-list">
                ${entries.map((item: AnyObj) => `
                    <a class="person-detail-book-link" href="${escapeAttr(item.href)}">
                        ${item.coverImage ? `<img class="person-detail-book-cover" src="${escapeAttr(item.coverImage)}" alt="${escapeAttr(item.title)} cover" loading="lazy" decoding="async">` : '<span class="person-detail-book-cover person-detail-book-cover-fallback" aria-hidden="true"></span>'}
                        <span class="person-detail-book-meta">
                            <span class="person-detail-book-title">${escapeHTML(item.label)}</span>
                            ${item.author ? `<span class="person-detail-book-author">${escapeHTML(item.author)}</span>` : ''}
                        </span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

function createBooksMarkup(person: AnyObj) {
    return `${createMediaMarkup(person, 'books', 'Books')}${createMediaMarkup(person, 'movies', 'Movies')}`;
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
    (lastFocusedPerson as HTMLElement | null)?.focus?.();
    lastFocusedPerson = null;
}

function openPeopleDetail(person: AnyObj, trigger: HTMLElement | null) {
    const modal = ensurePeopleDetailModal();
    lastFocusedPerson = (trigger || document.activeElement) as HTMLElement | null;
    modal.innerHTML = `
        <div class="person-detail-backdrop" data-action="close-person-detail"></div>
        <article class="person-detail-panel" role="dialog" aria-modal="true" aria-labelledby="person-detail-title">
            <button class="person-detail-close" type="button" data-action="close-person-detail" aria-label="Close person detail">X</button>
            <div class="person-detail-hero">
                <div class="person-detail-image-wrap">
                    <img src="${escapeAttr(person.image)}" alt="${escapeAttr(person.name)}" class="person-detail-image" srcset="${escapeAttr(person.srcset || '')}" sizes="(max-width: 768px) 78vw, 320px" width="400" height="400" loading="lazy" decoding="async">
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
    (modal.querySelector('.person-detail-close') as HTMLElement | null)?.focus?.();
}

export function initPeopleDetail(loadPeopleById: () => Promise<Map<string, AnyObj>>) {
    const grid = document.querySelector('.people-grid');
    if (!grid) return;

    async function openFromCard(card: HTMLElement) {
        const map = await loadPeopleById();
        const person = map.get(card.dataset.personId || '');
        if (person) openPeopleDetail(person, card);
    }

    grid.addEventListener('click', (event) => {
        const card = (event.target as Element | null)?.closest?.('.person-card') as HTMLElement | null;
        if (!card) return;
        openFromCard(card);
    });

    grid.addEventListener('keydown', (event) => {
        const ke = event as KeyboardEvent;
        if (ke.key !== 'Enter' && ke.key !== ' ') return;
        const card = (event.target as Element | null)?.closest?.('.person-card') as HTMLElement | null;
        if (!card) return;
        event.preventDefault();
        openFromCard(card);
    });

    document.addEventListener('click', (event) => {
        if ((event.target as Element | null)?.closest?.('[data-action="close-person-detail"]')) closePeopleDetail();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closePeopleDetail();
    });
}
