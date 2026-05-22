import { cloneTemplateElement } from './dom-template';

let lastFocusedPerson: HTMLElement | null = null;

interface PersonMediaItem {
    href?: string;
    coverImage?: string;
    title?: string;
    label?: string;
    author?: string;
}

interface PersonDetailRecord {
    image?: string;
    name?: string;
    srcset?: string;
    title?: string;
    bio?: string;
    lesson?: string;
    profileHref?: string;
    books?: PersonMediaItem[];
    movies?: PersonMediaItem[];
}

function renderMediaList(person: PersonDetailRecord, key: 'books' | 'movies', sectionId: string, listId: string) {
    const entries = person[key] || [];
    const section = document.getElementById(sectionId);
    const list = document.getElementById(listId);
    if (!section || !list) return;
    section.hidden = entries.length === 0;
    const fragment = document.createDocumentFragment();
    entries.forEach((item) => {
        const link = cloneTemplateElement<HTMLAnchorElement>('person-detail-media-link-template');
        if (!link) return;
        const image = link.querySelector('.person-detail-book-cover:not(.person-detail-book-cover-fallback)') as HTMLImageElement | null;
        const fallback = link.querySelector('.person-detail-book-cover-fallback') as HTMLElement | null;
        const title = link.querySelector('.person-detail-book-title');
        const author = link.querySelector('.person-detail-book-author') as HTMLElement | null;
        link.href = item.href || '#';
        if (image) {
            image.hidden = !item.coverImage;
            image.src = item.coverImage || '';
            image.alt = item.title ? `${item.title} cover` : '';
        }
        if (fallback) fallback.hidden = Boolean(item.coverImage);
        if (title) title.textContent = item.label || '';
        if (author) {
            author.hidden = !item.author;
            author.textContent = item.author || '';
        }
        fragment.appendChild(link);
    });
    list.replaceChildren(fragment);
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

function openPeopleDetail(person: PersonDetailRecord, trigger: HTMLElement | null) {
    const modal = document.getElementById('person-detail-modal');
    if (!modal) return;
    lastFocusedPerson = (trigger || document.activeElement) as HTMLElement | null;
    const image = document.getElementById('person-detail-image') as HTMLImageElement | null;
    const profile = document.getElementById('person-detail-profile-link') as HTMLAnchorElement | null;
    if (image) {
        image.src = person.image || '';
        image.alt = person.name || '';
        image.srcset = person.srcset || '';
    }
    const setText = (id: string, value: unknown) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value || '');
    };
    setText('person-detail-kicker', person.title);
    setText('person-detail-title', person.name);
    setText('person-detail-bio', person.bio || person.lesson);
    setText('person-detail-blurb', person.lesson);
    if (profile) {
        if (person.profileHref) {
            profile.href = person.profileHref;
            profile.hidden = false;
        } else {
            profile.hidden = true;
            profile.removeAttribute('href');
        }
    }
    renderMediaList(person, 'books', 'person-detail-books-section', 'person-detail-books-list');
    renderMediaList(person, 'movies', 'person-detail-movies-section', 'person-detail-movies-list');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('person-detail-open');
    (modal.querySelector('.person-detail-close') as HTMLElement | null)?.focus?.();
}

export function initPeopleDetail(loadPeopleById: () => Promise<Map<string, PersonDetailRecord>>) {
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
