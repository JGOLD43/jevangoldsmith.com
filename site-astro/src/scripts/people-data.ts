import { readInlineJson } from './data-fetch';

export function normalizePersonName(name: unknown): string {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// SSR always emits the people-merged-data <script type=application/json>
// block. Reaching the empty branch means a build regression, not a
// runtime condition.
export function loadPeopleData(): Map<string, AnyObj> {
    const mergedPeople = readInlineJson<AnyObj[]>('people-merged-data') ?? [];
    return new Map(
        (Array.isArray(mergedPeople) ? mergedPeople : [])
            .map((person) => [normalizePersonName(person.name), person])
    );
}
