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

function loadEnvLocal() {
    if (!fs.existsSync(ENV_LOCAL)) return;
    const content = fs.readFileSync(ENV_LOCAL, 'utf8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    }
}

async function refreshAccessToken(clientId, clientSecret, refreshToken) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });
    if (res.status === 400) {
        const text = await res.text();
        // invalid_grant = revoked refresh token; surface clearly without crashing CI
        const err = new Error(`Spotify token refresh failed (${res.status}): ${text}`);
        err.revoked = true;
        throw err;
    }
    if (!res.ok) {
        throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
    }
    const json = await res.json();
    return json.access_token;
}

async function fetchCurrentlyPlaying(accessToken) {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.status === 204) return null; // nothing playing
    if (res.status === 429) {
        console.warn('Spotify rate-limited; skipping this poll');
        return null;
    }
    if (!res.ok) {
        throw new Error(`currently-playing failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
}

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
    loadEnvLocal();
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        console.error('Missing Spotify credentials. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.');
        process.exit(1);
    }

    let accessToken;
    try {
        accessToken = await refreshAccessToken(clientId, clientSecret, refreshToken);
    } catch (err) {
        if (err.revoked) {
            console.error('Refresh token revoked. Re-run scripts/spotify-oauth-helper.js and update SPOTIFY_REFRESH_TOKEN secret.');
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
