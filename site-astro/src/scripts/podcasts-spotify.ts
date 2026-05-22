import { formatEpisodeDuration, formatRelativeDate } from '../lib/dates';
import { escapeAttr, escapeHtml } from '../lib/html-escape';
import { fetchJson } from './data-fetch';

function buildSpotifyEpisodeCard(ep: AnyObj) {
    const card = document.createElement('div');
    card.className = 'movie-card podcast-card js-zoom-item';
    card.dataset.spotify = 'episode';

    const showName = escapeHtml(ep.showName || 'Unknown show');
    const episodeName = escapeHtml(ep.episodeName || 'Untitled episode');
    const duration = escapeHtml(formatEpisodeDuration(ep.durationMs));
    const listenedAt = escapeHtml(formatRelativeDate(ep.listenedAt));
    const image = ep.image
        ? `<img src="${escapeAttr(ep.image)}" alt="${escapeAttr(ep.showName || ep.episodeName || '')}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`
        : `<div class="podcast-cover-placeholder">🎧</div>`;
    const link = ep.episodeUrl
        ? `<a class="spotify-episode-link" href="${escapeAttr(ep.episodeUrl)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`
        : '';

    card.innerHTML = `
        <div class="movie-poster-wrapper">${image}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${episodeName}</h3>
            </div>
            <div class="podcast-category-badge">${showName}</div>
            ${duration ? `<div class="spotify-episode-duration">${duration}${listenedAt ? ` · ${listenedAt}` : ''}</div>` : (listenedAt ? `<div class="spotify-episode-duration">${listenedAt}</div>` : '')}
            ${link}
        </div>
    `;
    return card;
}

function buildSpotifyShowCard(show: AnyObj) {
    const card = document.createElement('div');
    card.className = 'movie-card podcast-card js-zoom-item';
    card.dataset.spotify = 'show';

    const name = escapeHtml(show.name || 'Untitled show');
    const publisher = escapeHtml(show.publisher || '');
    const image = show.image
        ? `<img src="${escapeAttr(show.image)}" alt="${escapeAttr(show.name || '')}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`
        : `<div class="podcast-cover-placeholder">🎙️</div>`;
    const link = show.url
        ? `<a class="spotify-episode-link" href="${escapeAttr(show.url)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`
        : '';

    card.innerHTML = `
        <div class="movie-poster-wrapper">${image}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${name}</h3>
            </div>
            ${publisher ? `<div class="podcast-category-badge">${publisher}</div>` : ''}
            ${link}
        </div>
    `;
    return card;
}

async function loadJSON(url: string) {
    try {
        return await fetchJson(url) as AnyObj;
    } catch {
        return null;
    }
}

function renderSpotifyMeta(elId: string, generatedAt: string, count: number, label: string) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!count) {
        el.textContent = '';
        return;
    }
    const when = generatedAt ? ` · synced ${formatRelativeDate(generatedAt)}` : '';
    el.textContent = `${count} ${label}${when}`;
}

export async function renderSpotifyRecentEpisodes() {
    const data = await loadJSON('data/podcast-episodes.json');
    if (!data || !Array.isArray(data.episodes) || data.episodes.length === 0) return;

    const container = document.getElementById('spotify-recent-container');
    const section = document.getElementById('spotify-recent-section');
    if (!container || !section) return;

    const recent = data.episodes.slice(0, 24);
    if (container.children.length > 0) {
        section.hidden = false;
        renderSpotifyMeta('spotify-recent-meta', data.generatedAt, recent.length, recent.length === 1 ? 'recent episode' : 'recent episodes');
        return;
    }
    const frag = document.createDocumentFragment();
    recent.forEach((ep: AnyObj) => frag.appendChild(buildSpotifyEpisodeCard(ep)));
    container.appendChild(frag);
    section.hidden = false;
    renderSpotifyMeta('spotify-recent-meta', data.generatedAt, recent.length, recent.length === 1 ? 'recent episode' : 'recent episodes');
}

export async function renderSpotifyFollowedShows() {
    const data = await loadJSON('data/podcast-shows.json');
    if (!data || !Array.isArray(data.shows) || data.shows.length === 0) return;

    const container = document.getElementById('spotify-shows-container');
    const section = document.getElementById('spotify-shows-section');
    if (!container || !section) return;

    if (container.children.length > 0) {
        section.hidden = false;
        renderSpotifyMeta('spotify-shows-meta', data.generatedAt, data.shows.length, data.shows.length === 1 ? 'show' : 'shows');
        return;
    }
    const frag = document.createDocumentFragment();
    data.shows.forEach((show: AnyObj) => frag.appendChild(buildSpotifyShowCard(show)));
    container.appendChild(frag);
    section.hidden = false;
    renderSpotifyMeta('spotify-shows-meta', data.generatedAt, data.shows.length, data.shows.length === 1 ? 'show' : 'shows');
}
