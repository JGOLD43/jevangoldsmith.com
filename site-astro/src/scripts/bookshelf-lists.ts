import { tryRead, tryWrite } from '../lib/storage';
import { onDomReady } from './dom-ready';

const STORAGE_KEY = 'jgold-reading-lists-v1';

interface ReadingListBook {
    title: string;
    author: string;
    sourceId: string;
    sourceName: string;
}

interface ReadingList {
    id: string;
    name: string;
    createdAt: string;
    books: ReadingListBook[];
}

function readLists(): ReadingList[] {
    const lists = tryRead<ReadingList[]>(STORAGE_KEY, []);
    return Array.isArray(lists) ? lists.filter((list) => list?.id && list?.name && Array.isArray(list.books)) : [];
}

function makeElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
}

function renderLists() {
    const lists = readLists();
    document.querySelectorAll<HTMLElement>('[data-saved-lists]').forEach((root) => {
        root.replaceChildren();
        if (!lists.length) {
            root.appendChild(makeElement('p', 'saved-list-empty', 'No lists saved yet. Choose books above to make your first one.'));
            return;
        }

        const grid = makeElement('div', 'saved-list-grid');
        lists.forEach((list) => {
            const card = makeElement('article', 'saved-list-card');
            const header = makeElement('header');
            const titleWrap = makeElement('div');
            titleWrap.append(makeElement('h5', undefined, list.name), makeElement('span', undefined, `${list.books.length} book${list.books.length === 1 ? '' : 's'}`));
            const remove = makeElement('button', undefined, 'Delete');
            remove.type = 'button';
            remove.dataset.deleteList = list.id;
            remove.setAttribute('aria-label', `Delete ${list.name}`);
            header.append(titleWrap, remove);

            const books = makeElement('ul');
            list.books.forEach((book) => {
                const item = makeElement('li', undefined, book.title);
                if (book.author) item.appendChild(makeElement('small', undefined, book.author));
                books.appendChild(item);
            });
            card.append(header, books);
            grid.appendChild(card);
        });
        root.appendChild(grid);
    });
}

function selectedButtons(builder: HTMLElement) {
    return Array.from(builder.querySelectorAll<HTMLButtonElement>('.bookshelf-pick[aria-pressed="true"]'));
}

function updateBuilder(builder: HTMLElement) {
    const count = selectedButtons(builder).length;
    const countNode = builder.querySelector<HTMLElement>('[data-selected-count]');
    const saveButton = builder.querySelector<HTMLButtonElement>('[data-save-list]');
    if (countNode) countNode.textContent = String(count);
    if (saveButton) saveButton.disabled = count === 0;
}

function setStatus(builder: HTMLElement, message: string) {
    const status = builder.querySelector<HTMLElement>('[data-list-status]');
    if (status) status.textContent = message;
}

function initShelfSwitching(tool: HTMLElement) {
    const buttons = Array.from(tool.querySelectorAll<HTMLButtonElement>('[data-bookshelf-switch]'));
    const panels = Array.from(tool.querySelectorAll<HTMLElement>('[data-bookshelf-source]'));
    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const selected = button.dataset.bookshelfSwitch || '';
            buttons.forEach((candidate) => candidate.setAttribute('aria-selected', candidate === button ? 'true' : 'false'));
            panels.forEach((panel) => { panel.hidden = panel.dataset.bookshelfSource !== selected; });
        });
    });
}

function initBuilder(builder: HTMLElement) {
    const picks = Array.from(builder.querySelectorAll<HTMLButtonElement>('.bookshelf-pick'));
    const search = builder.querySelector<HTMLInputElement>('[data-discovery-search]');

    picks.forEach((pick) => {
        pick.addEventListener('click', () => {
            pick.setAttribute('aria-pressed', pick.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
            setStatus(builder, '');
            updateBuilder(builder);
        });
    });

    search?.addEventListener('input', () => {
        const query = search.value.trim().toLocaleLowerCase();
        picks.forEach((pick) => {
            pick.hidden = Boolean(query) && !pick.textContent?.toLocaleLowerCase().includes(query);
        });
    });

    builder.querySelector<HTMLButtonElement>('[data-select-visible]')?.addEventListener('click', () => {
        picks.filter((pick) => !pick.hidden).forEach((pick) => pick.setAttribute('aria-pressed', 'true'));
        updateBuilder(builder);
    });

    builder.querySelector<HTMLButtonElement>('[data-clear-selection]')?.addEventListener('click', () => {
        picks.forEach((pick) => pick.setAttribute('aria-pressed', 'false'));
        updateBuilder(builder);
    });

    builder.querySelector<HTMLButtonElement>('[data-save-list]')?.addEventListener('click', () => {
        const chosen = selectedButtons(builder);
        if (!chosen.length) return;
        const sourceId = builder.dataset.sourceId || '';
        const sourceName = builder.dataset.sourceName || 'Public shelf';
        const nameInput = builder.querySelector<HTMLInputElement>('[data-list-name]');
        const name = nameInput?.value.trim() || `${sourceName} reading list`;
        const books = chosen.map((pick) => ({
            title: pick.dataset.bookTitle || '',
            author: pick.dataset.bookAuthor || '',
            sourceId,
            sourceName
        })).filter((book) => book.title);
        const lists = readLists();
        lists.unshift({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name, createdAt: new Date().toISOString(), books });
        tryWrite(STORAGE_KEY, lists);
        chosen.forEach((pick) => pick.setAttribute('aria-pressed', 'false'));
        if (nameInput) nameInput.value = '';
        updateBuilder(builder);
        setStatus(builder, `Saved “${name}” with ${books.length} book${books.length === 1 ? '' : 's'}.`);
        renderLists();
    });

    updateBuilder(builder);
}

function init() {
    document.querySelectorAll<HTMLElement>('[data-bookshelf-tool]').forEach(initShelfSwitching);
    document.querySelectorAll<HTMLElement>('[data-list-builder]').forEach(initBuilder);
    document.addEventListener('click', (event) => {
        const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-delete-list]');
        if (!button?.dataset.deleteList) return;
        tryWrite(STORAGE_KEY, readLists().filter((list) => list.id !== button.dataset.deleteList));
        renderLists();
    });
    renderLists();
}

onDomReady(init, 'bookshelf lists init');
