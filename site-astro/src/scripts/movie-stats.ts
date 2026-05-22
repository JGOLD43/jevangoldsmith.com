import {
    computeMovieStats,
    fmtHours,
    fmtRuntime,
    watchCount,
    type ComputedMovieStats,
    type RuntimeMovieStatsMovie
} from '../lib/movie-stats-core';
import { tryReadString, tryWrite } from '../lib/storage';
import { onDomReady } from './dom-ready';

const PANEL_ID = 'movie-stats-panel';

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function headlineCard(value: string, label: string) {
    const card = el('div', 'stats-headline-card');
    card.append(el('div', 'stats-headline-value', value), el('div', 'stats-headline-label', label));
    return card;
}

function renderHeadline(stats: ComputedMovieStats) {
    const grid = el('div', 'stats-headline-grid');
    grid.append(
        headlineCard(stats.totalHours.toLocaleString(), 'Total hours watched'),
        headlineCard(stats.totalFilms.toLocaleString(), 'Films logged'),
        headlineCard(stats.totalWatches.toLocaleString(), 'Total watches'),
        headlineCard(fmtRuntime(stats.avgRuntime), 'Avg runtime')
    );
    return grid;
}

function renderExtremes(stats: ComputedMovieStats) {
    const wrap = el('div', 'stats-extremes');
    for (const [title, movie] of [['Longest film', stats.longest], ['Shortest film', stats.shortest]] as const) {
        if (!movie) continue;
        const card = el('div', 'stats-extreme-card');
        const row = el('div', 'stats-extreme-movie');
        if (movie.poster) {
            const image = el('img', 'stats-extreme-poster');
            image.src = movie.poster;
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            row.appendChild(image);
        }
        const copy = el('div');
        copy.append(
            el('div', 'stats-extreme-name', movie.title || ''),
            el('div', 'stats-extreme-meta', `${movie.year || ''} · ${fmtRuntime(movie.runtime)}`)
        );
        row.appendChild(copy);
        card.append(el('div', 'stats-extreme-title', title), row);
        wrap.appendChild(card);
    }
    return wrap;
}

function barRow(label: string, value: string, pct: number) {
    const row = el('div', 'stats-bar-row');
    const track = el('span', 'stats-bar-track');
    const fill = el('span', 'stats-bar-fill');
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    row.append(el('span', 'stats-bar-label', label), track, el('span', 'stats-bar-value', value));
    return row;
}

function renderBarSection(title: string, rows: Array<[string, string, number]>) {
    if (rows.length === 0) return null;
    const section = el('section', 'stats-section');
    section.appendChild(el('h3', 'stats-section-title', title));
    for (const row of rows) section.appendChild(barRow(...row));
    return section;
}

function renderHoursByGenreBars(stats: ComputedMovieStats) {
    const entries = Object.entries(stats.hoursByGenre).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 0;
    return renderBarSection('Hours by genre', entries.map(([genre, mins]) => [
        genre,
        fmtHours(mins),
        max > 0 ? Math.max(2, Math.round((mins / max) * 100)) : 0
    ]));
}

function renderFilmsByDecade(stats: ComputedMovieStats) {
    const entries = Object.entries(stats.filmsByDecade).sort((a, b) => a[0].localeCompare(b[0]));
    const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);
    return renderBarSection('Films by decade', entries.map(([decade, count]) => [
        decade,
        String(count),
        max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0
    ]));
}

function renderRatingHistogram(stats: ComputedMovieStats) {
    const entries = [5, 4, 3, 2, 1].map((rating) => [rating, stats.filmsByRating[rating] || 0] as [number, number]);
    const total = entries.reduce((acc, [, count]) => acc + count, 0);
    if (total === 0) return null;
    const max = entries.reduce((m, [, count]) => Math.max(m, count), 0);
    return renderBarSection('Films by rating', entries.map(([rating, count]) => [
        '★'.repeat(rating),
        String(count),
        max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0
    ]));
}

function renderAvgRatingByGenre(stats: ComputedMovieStats) {
    if (!stats.avgRatingByGenre.length) return null;
    const section = el('section', 'stats-section');
    section.appendChild(el('h3', 'stats-section-title', 'Avg rating by genre'));
    for (const { genre, avg, count } of stats.avgRatingByGenre) {
        const row = barRow(genre, '', Math.max(2, Math.round((avg / 5) * 100)));
        const value = row.querySelector('.stats-bar-value');
        if (value) {
            value.textContent = `${avg.toFixed(2)}★ `;
            value.appendChild(el('span', 'stats-bar-aside', `(${count})`));
        }
        section.appendChild(row);
    }
    return section;
}

function renderMostRewatched(stats: ComputedMovieStats) {
    if (!stats.mostRewatched.length) return null;
    const section = el('section', 'stats-section');
    section.appendChild(el('h3', 'stats-section-title', 'Most rewatched'));
    const list = el('ul', 'stats-rewatch-list');
    for (const movie of stats.mostRewatched) {
        const item = el('li');
        item.append(
            el('span', 'stats-rewatch-count', `${watchCount(movie)}×`),
            el('span', 'stats-rewatch-title', movie.title || ''),
            el('span', 'stats-rewatch-year', String(movie.year || ''))
        );
        list.appendChild(item);
    }
    section.appendChild(list);
    return section;
}

function renderEmpty(missing: number) {
    const wrap = el('div', 'stats-empty');
    const message = el('p');
    message.append('No runtime data yet. Run ');
    message.appendChild(el('code', undefined, 'npm run enrich:movies'));
    message.append(' with a TMDB API key to populate stats.');
    wrap.appendChild(message);
    if (missing > 0) {
        wrap.appendChild(el('p', 'stats-empty-meta', `${missing} film${missing === 1 ? '' : 's'} missing runtime.`));
    }
    return wrap;
}

function render(movies: RuntimeMovieStatsMovie[]) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const body = panel.querySelector('.stats-body') as HTMLElement | null;
    if (!body) return;
    if (body.dataset.initialStatsAdopted !== 'true' && body.children.length > 0) {
        body.dataset.initialStatsAdopted = 'true';
        if (Number(body.dataset.initialCount || -1) === movies.length) return;
    }

    const stats = computeMovieStats(movies);
    if (stats.enrichedCount === 0) {
        body.replaceChildren(renderEmpty(stats.totalFilms));
        return;
    }

    const nodes = [
        renderHeadline(stats),
        renderExtremes(stats),
        renderHoursByGenreBars(stats),
        renderFilmsByDecade(stats),
        renderRatingHistogram(stats),
        renderAvgRatingByGenre(stats),
        renderMostRewatched(stats)
    ].filter((node): node is HTMLElement => Boolean(node));
    body.replaceChildren(...nodes);
}

function setOpen(open: boolean) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const btn = document.querySelector<HTMLButtonElement>('.stats-toggle');
    panel.classList.toggle('collapsed', !open);
    panel.hidden = !open;
    if (btn) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Hide watch stats' : 'Show watch stats');
    }
}

function toggle() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const open = panel.hasAttribute('hidden');
    setOpen(open);
    tryWrite('movie-stats-collapsed', open ? '0' : '1');
}

function init() {
    if (!document.getElementById(PANEL_ID)) return;
    const btn = document.querySelector<HTMLButtonElement>('.stats-toggle');
    if (btn) btn.addEventListener('click', toggle);
    setOpen(tryReadString('movie-stats-collapsed') === '0');
}

onDomReady(init, 'movie-stats init');

export { render };
