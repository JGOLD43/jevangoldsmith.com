#!/usr/bin/env node
// Hourly: capture currently-playing podcast episode from Spotify and append
// to data/podcast-episodes.json. Idempotent: skips if same episode is already
// the most recent entry within the dedupe window.
//
// Required env vars (set as GitHub Secrets in CI; .env.local locally):
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//   SPOTIFY_REFRESH_TOKEN
//
// Exit codes:
//   0 = success (episode appended OR no new episode to log)
//   1 = unexpected error (Spotify API error, write failure, etc.)
// Auth-revoked condition logs error and exits 0 so the workflow doesn't email
// on every poll — a separate check would alert on stale data.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const EPISODES_PATH = path.join(ROOT, 'data', 'podcast-episodes.json');
const MAX_EPISODES = 500; // cap file size; oldest pruned
const DEDUPE_WINDOW_MS = 30 * 60 * 1000; // same episode within 30 min = no-op

// dotenv reads .env.local. Token refresh + GET helpers live in _spotify-lib.js.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const { refreshAccessToken, spotifyFetch, readSpotifyEnv } = require('./_spotify-lib');

const fetchCurrentlyPlaying = (token) =>
  spotifyFetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', token);

function readEpisodes() {
    if (!fs.existsSync(EPISODES_PATH)) {
        return { generatedAt: null, episodes: [] };
    }
    const raw = fs.readFileSync(EPISODES_PATH, 'utf8');
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.episodes)) {
            return { generatedAt: null, episodes: [] };
        }
        return parsed;
    } catch {
        return { generatedAt: null, episodes: [] };
    }
}

function writeEpisodes(data) {
    fs.writeFileSync(EPISODES_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

function isDuplicate(episodes, episodeId, nowMs) {
    if (episodes.length === 0) return false;
    const last = episodes[0];
    if (last.episodeId !== episodeId) return false;
    const lastMs = new Date(last.listenedAt).getTime();
    return nowMs - lastMs < DEDUPE_WINDOW_MS;
}

function mapEpisode(item) {
    const ep = item.item;
    if (!ep || ep.type !== 'episode') return null;
    const show = ep.show || {};
    const image = (ep.images && ep.images[0] && ep.images[0].url)
        || (show.images && show.images[0] && show.images[0].url)
        || null;
    return {
        episodeId: ep.id,
        episodeName: ep.name,
        episodeUrl: ep.external_urls && ep.external_urls.spotify ? ep.external_urls.spotify : null,
        showId: show.id || null,
        showName: show.name || null,
        showPublisher: show.publisher || null,
        durationMs: typeof ep.duration_ms === 'number' ? ep.duration_ms : null,
        releaseDate: ep.release_date || null,
        image,
        description: typeof ep.description === 'string' ? ep.description.slice(0, 500) : null,
        listenedAt: new Date().toISOString()
    };
}

async function main() {
    const { clientId, clientSecret, refreshToken } = readSpotifyEnv();

    let accessToken;
    try {
        accessToken = await refreshAccessToken(clientId, clientSecret, refreshToken);
    } catch (err) {
        if (err.revoked) {
            console.error('Refresh token revoked. Re-run scripts/sync/spotify-oauth-helper.js and update SPOTIFY_REFRESH_TOKEN secret.');
            // exit 0 so we don't get an email every hour
            process.exit(0);
        }
        throw err;
    }

    const playback = await fetchCurrentlyPlaying(accessToken);
    if (!playback || playback.currently_playing_type !== 'episode') {
        console.log('No podcast episode currently playing. Nothing to log.');
        return;
    }

    const mapped = mapEpisode(playback);
    if (!mapped || !mapped.episodeId) {
        console.log('Episode payload missing required fields. Skipping.');
        return;
    }

    const data = readEpisodes();
    const nowMs = Date.now();
    if (isDuplicate(data.episodes, mapped.episodeId, nowMs)) {
        console.log(`Already logged "${mapped.episodeName}" within dedupe window. Skipping.`);
        return;
    }

    data.episodes.unshift(mapped);
    if (data.episodes.length > MAX_EPISODES) {
        data.episodes = data.episodes.slice(0, MAX_EPISODES);
    }
    data.generatedAt = new Date().toISOString();
    writeEpisodes(data);
    console.log(`Logged: "${mapped.episodeName}" — ${mapped.showName}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
