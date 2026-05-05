// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

// Compute + render movie watch stats from enriched movie data.
// Exposes window.MovieStats.render(movies) which (re)builds the stats panel.
(function () {
    'use strict';

    const PANEL_ID = 'movie-stats-panel';

    function decadeFor(year: unknown) {
        const y = Number(year);
        if (!y) return null;
        return `${Math.floor(y / 10) * 10}s`;
    }

    function safeRating(movie: AnyObj): number | null {
        const n = Number(movie.starCount);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    function watchCount(movie: AnyObj): number {
        const n = Number(movie.timesWatched);
        return Number.isFinite(n) && n > 0 ? n : 1;
    }

    function compute(movies: AnyObj[]) {
        const list = Array.isArray(movies) ? movies : [];
        const filmsWithRuntime = list.filter((m) => Number(m.runtime) > 0);

        const totalFilms = list.length;
        const totalWatches = list.reduce((acc, m) => acc + watchCount(m), 0);
        const totalMinutes = list.reduce(
            (acc, m) => acc + Number(m.runtime || 0) * watchCount(m),
            0
        );
        const avgRuntime = filmsWithRuntime.length
            ? Math.round(
                  filmsWithRuntime.reduce((acc, m) => acc + Number(m.runtime), 0) /
                      filmsWithRuntime.length
              )
            : 0;

        let longest: AnyObj = null;
        let shortest: AnyObj = null;
        for (const m of filmsWithRuntime) {
            if (!longest || Number(m.runtime) > Number(longest.runtime)) longest = m;
            if (!shortest || Number(m.runtime) < Number(shortest.runtime)) shortest = m;
        }

        const hoursByGenre: Record<string, number> = {};
        for (const m of list) {
            const minutes = Number(m.runtime || 0) * watchCount(m);
            if (minutes <= 0) continue;
            const genre = m.genre || 'Uncategorized';
            hoursByGenre[genre] = (hoursByGenre[genre] || 0) + minutes;
        }

        const filmsByDecade: Record<string, number> = {};
        for (const m of list) {
            const d = decadeFor(m.year);
            if (!d) continue;
            filmsByDecade[d] = (filmsByDecade[d] || 0) + 1;
        }

        const filmsByRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const m of list) {
            const r = safeRating(m);
            if (r != null) filmsByRating[r] = (filmsByRating[r] || 0) + 1;
        }

        const ratingTotals: Record<string, { sum: number; count: number }> = {};
        for (const m of list) {
            const r = safeRating(m);
            if (r == null) continue;
            const genre = m.genre || 'Uncategorized';
            if (!ratingTotals[genre]) ratingTotals[genre] = { sum: 0, count: 0 };
            ratingTotals[genre].sum += r;
            ratingTotals[genre].count += 1;
        }
        const avgRatingByGenre = Object.entries(ratingTotals)
            .map(([genre, { sum, count }]) => ({ genre, avg: sum / count, count }))
            .sort((a, b) => b.avg - a.avg);

        const mostRewatched = list
            .filter((m) => watchCount(m) > 1)
            .sort((a, b) => watchCount(b) - watchCount(a))
            .slice(0, 5);

        return {
            totalFilms,
            totalWatches,
            totalMinutes,
            totalHours: Math.round(totalMinutes / 60),
            avgRuntime,
            longest,
            shortest,
            hoursByGenre,
            filmsByDecade,
            filmsByRating,
            avgRatingByGenre,
            mostRewatched,
            enrichedCount: filmsWithRuntime.length
        };
    }

    const escapeHTML = window.escapeHTML as (s: unknown) => string;

    function fmtRuntime(minutes: unknown): string {
        const m = Number(minutes) || 0;
        if (m <= 0) return '—';
        const h = Math.floor(m / 60);
        const rem = m % 60;
        if (h === 0) return `${rem}m`;
        if (rem === 0) return `${h}h`;
        return `${h}h ${rem}m`;
    }

    function fmtHours(minutes: number): string {
        const h = minutes / 60;
        if (h >= 100) return `${Math.round(h)} hr`;
        return `${h.toFixed(1)} hr`;
    }

    function renderHeadline(stats: AnyObj) {
        return `
            <div class="stats-headline-grid">
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${stats.totalHours.toLocaleString()}</div>
                    <div class="stats-headline-label">Total hours watched</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${stats.totalFilms.toLocaleString()}</div>
                    <div class="stats-headline-label">Films logged</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${stats.totalWatches.toLocaleString()}</div>
                    <div class="stats-headline-label">Total watches</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${fmtRuntime(stats.avgRuntime)}</div>
                    <div class="stats-headline-label">Avg runtime</div>
                </div>
            </div>
        `;
    }

    function renderExtremes(stats: AnyObj) {
        const card = (title: string, movie: AnyObj) => {
            if (!movie) return '';
            return `
                <div class="stats-extreme-card">
                    <div class="stats-extreme-title">${escapeHTML(title)}</div>
                    <div class="stats-extreme-movie">
                        ${movie.poster ? `<img src="${escapeHTML(movie.poster)}" alt="" class="stats-extreme-poster" loading="lazy" decoding="async">` : ''}
                        <div>
                            <div class="stats-extreme-name">${escapeHTML(movie.title)}</div>
                            <div class="stats-extreme-meta">${escapeHTML(movie.year || '')} · ${escapeHTML(fmtRuntime(movie.runtime))}</div>
                        </div>
                    </div>
                </div>
            `;
        };
        return `
            <div class="stats-extremes">
                ${card('Longest film', stats.longest)}
                ${card('Shortest film', stats.shortest)}
            </div>
        `;
    }

    function renderHoursByGenreBars(stats: AnyObj) {
        const entries = (Object.entries(stats.hoursByGenre) as [string, number][]).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) return '';
        const max = entries[0][1];
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Hours by genre</h3>
                ${entries
                    .map(([genre, mins]) => {
                        const pct = max > 0 ? Math.max(2, Math.round((mins / max) * 100)) : 0;
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${escapeHTML(genre)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${escapeHTML(fmtHours(mins))}</span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderFilmsByDecade(stats: AnyObj) {
        const entries = (Object.entries(stats.filmsByDecade) as [string, number][]).sort((a, b) => a[0].localeCompare(b[0]));
        if (entries.length === 0) return '';
        const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Films by decade</h3>
                ${entries
                    .map(([decade, count]) => {
                        const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${escapeHTML(decade)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${count}</span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderRatingHistogram(stats: AnyObj) {
        const entries = [5, 4, 3, 2, 1].map((r) => [r, stats.filmsByRating[r] || 0]);
        const total = entries.reduce((acc, [, v]) => acc + v, 0);
        if (total === 0) return '';
        const max = entries.reduce((m, [, v]) => Math.max(m, v), 0);
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Films by rating</h3>
                ${entries
                    .map(([r, count]) => {
                        const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${'★'.repeat(r)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${count}</span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderAvgRatingByGenre(stats: AnyObj) {
        if (!stats.avgRatingByGenre.length) return '';
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Avg rating by genre</h3>
                ${stats.avgRatingByGenre
                    .map(({ genre, avg, count }) => {
                        const pct = Math.max(2, Math.round((avg / 5) * 100));
                        return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${escapeHTML(genre)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${pct}%"></span></span>
                                <span class="stats-bar-value">${avg.toFixed(2)}★ <span class="stats-bar-aside">(${count})</span></span>
                            </div>
                        `;
                    })
                    .join('')}
            </section>
        `;
    }

    function renderMostRewatched(stats: AnyObj) {
        if (!stats.mostRewatched.length) return '';
        return `
            <section class="stats-section">
                <h3 class="stats-section-title">Most rewatched</h3>
                <ul class="stats-rewatch-list">
                    ${stats.mostRewatched
                        .map(
                            (m: AnyObj) => `
                        <li>
                            <span class="stats-rewatch-count">${watchCount(m)}×</span>
                            <span class="stats-rewatch-title">${escapeHTML(m.title)}</span>
                            <span class="stats-rewatch-year">${escapeHTML(m.year || '')}</span>
                        </li>
                    `
                        )
                        .join('')}
                </ul>
            </section>
        `;
    }

    function renderEmpty(missing: number) {
        return `
            <div class="stats-empty">
                <p>No runtime data yet. Run <code>npm run enrich:movies</code> with a TMDB API key to populate stats.</p>
                ${missing > 0 ? `<p class="stats-empty-meta">${missing} film${missing === 1 ? '' : 's'} missing runtime.</p>` : ''}
            </div>
        `;
    }

    function render(movies: AnyObj[]) {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const body = panel.querySelector('.stats-body') as HTMLElement | null;
        if (!body) return;

        const stats = compute(movies);
        if (stats.enrichedCount === 0) {
            body.innerHTML = renderEmpty(stats.totalFilms);
            return;
        }

        body.innerHTML = [
            renderHeadline(stats),
            renderExtremes(stats),
            renderHoursByGenreBars(stats),
            renderFilmsByDecade(stats),
            renderRatingHistogram(stats),
            renderAvgRatingByGenre(stats),
            renderMostRewatched(stats)
        ].join('');
    }

    function toggle() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const body = panel.querySelector('.stats-body') as HTMLElement | null;
        const btn = panel.querySelector('.stats-toggle');
        const collapsed = panel.classList.toggle('collapsed');
        if (body) body.style.display = collapsed ? 'none' : '';
        if (btn) {
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            btn.setAttribute('aria-label', collapsed ? 'Show stats' : 'Hide stats');
        }
        try {
            localStorage.setItem('movie-stats-collapsed', collapsed ? '1' : '0');
        } catch (_) {
            // ignore storage errors
        }
    }

    function init() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const btn = panel.querySelector('.stats-toggle');
        if (btn) btn.addEventListener('click', toggle);
        let collapsed = false;
        try {
            collapsed = localStorage.getItem('movie-stats-collapsed') === '1';
        } catch (_) {
            // ignore
        }
        if (collapsed) {
            panel.classList.add('collapsed');
            const body = panel.querySelector('.stats-body') as HTMLElement | null;
            if (body) body.style.display = 'none';
            if (btn) {
                btn.setAttribute('aria-expanded', 'false');
                btn.setAttribute('aria-label', 'Show stats');
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    window.MovieStats = { render, compute };
})();

export {};
