import { fetchJson, readInlineJson } from './data-fetch';

export function normalizePersonName(name: unknown): string {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function loadPeopleData(): Promise<Map<string, AnyObj>> {
    let mergedPeople = readInlineJson<AnyObj[]>('people-merged-data') ?? [];
    if (!Array.isArray(mergedPeople)) mergedPeople = [];

    if (!mergedPeople.length) {
        try {
            const fallback = await fetchJson('data/people.merged.generated.json');
            mergedPeople = Array.isArray(fallback?.people) ? fallback.people : [];
        } catch (error) {
            console.error('people: merged data unavailable', error);
        }
    }

    return new Map(mergedPeople.map((person) => [normalizePersonName(person.name), person]));
}
