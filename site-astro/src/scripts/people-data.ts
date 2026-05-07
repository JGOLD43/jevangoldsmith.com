import { fetchJson } from './data-fetch';

export function normalizePersonName(name: unknown): string {
    return String(name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Modal-only payload (bio, thesis, books, movies, profileHref). Loaded on
// first card-click instead of inlined into people.html. SSR card markup
// already carries name/title/lesson/image/srcset/searchText, so this fetch
// only kicks in when user actually opens a person detail modal.
//
// Pre-fetch is fired during requestIdleCallback to keep the first-click
// modal-open feeling instant.
const URL = '/api/v1/people-modal.json';
let cache: Promise<Map<string, AnyObj>> | null = null;

export function preloadPeopleModalData(): void {
    if (!cache) loadPeopleModalData();
}

export function loadPeopleModalData(): Promise<Map<string, AnyObj>> {
    if (cache) return cache;
    cache = fetchJson(URL).then((data: AnyObj) => {
        const list: AnyObj[] = Array.isArray(data) ? data : [];
        return new Map(list.map((p) => [normalizePersonName(p.name), p]));
    }).catch((error) => {
        console.error('Failed to load people modal data', error);
        cache = null;
        return new Map();
    });
    return cache;
}
