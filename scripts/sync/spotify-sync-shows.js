#!/usr/bin/env node
// Monthly: snapshot Spotify followed podcast shows to data/podcast-shows.json.
// Overwrites the file. Pagination: Spotify caps at 50 shows per page.
//
// Required env vars (set as GitHub Secrets in CI; .env.local locally):
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//   SPOTIFY_REFRESH_TOKEN

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const SHOWS_PATH = path.join(ROOT, 'data', 'podcast-shows.json');
const PAGE_LIMIT = 50;

// Use dotenv to load .env.local. Scripts previously parsed it themselves
// (~25 LOC each duplicated four times); dotenv handles quoted values,
// comments, and escapes correctly out of the box.
// Optional: dotenv is for local .env.local. In CI env comes from secrets and
// node_modules isn't installed for this cron, so don't crash on a missing dep.
try { require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') }); } catch { /* dotenv optional outside local dev */ }
function loadEnvLocal() { /* no-op: dotenv.config() above already loaded vars */ }

const { refreshAccessToken, spotifyFetch, readSpotifyEnv } = require('./_spotify-lib');

async function fetchShowsPage(accessToken, offset) {
    const url = new URL('https://api.spotify.com/v1/me/shows');
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('offset', String(offset));
    return spotifyFetch(url, accessToken);
}

function mapShow(item) {
    const show = item.show || item;
    if (!show || !show.id) return null;
    const image = show.images && show.images[0] && show.images[0].url ? show.images[0].url : null;
    return {
        showId: show.id,
        name: show.name,
        publisher: show.publisher || null,
        description: typeof show.description === 'string' ? show.description.slice(0, 500) : null,
        totalEpisodes: typeof show.total_episodes === 'number' ? show.total_episodes : null,
        url: show.external_urls && show.external_urls.spotify ? show.external_urls.spotify : null,
        image,
        addedAt: item.added_at || null
    };
}

async function main() {
    // No-op cleanly when Spotify secrets aren't configured, so the cron doesn't
    // email a failure on every run until the secrets exist.
    let creds;
    try {
        creds = readSpotifyEnv();
    } catch (err) {
        console.log(`Spotify not configured (${err.message}). Skipping.`);
        process.exit(0);
    }
    const { clientId, clientSecret, refreshToken } = creds;

    let accessToken;
    try {
        accessToken = await refreshAccessToken(clientId, clientSecret, refreshToken);
    } catch (err) {
        if (err.revoked) {
            console.error('Refresh token revoked. Re-run scripts/sync/spotify-oauth-helper.js and update SPOTIFY_REFRESH_TOKEN secret.');
            process.exit(0);
        }
        throw err;
    }

    const shows = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
        const page = await fetchShowsPage(accessToken, offset);
        total = typeof page.total === 'number' ? page.total : 0;
        for (const item of (page.items || [])) {
            const mapped = mapShow(item);
            if (mapped) shows.push(mapped);
        }
        offset += PAGE_LIMIT;
        if (!page.items || page.items.length === 0) break;
    }

    shows.sort((a, b) => a.name.localeCompare(b.name));
    const data = {
        generatedAt: new Date().toISOString(),
        total: shows.length,
        shows
    };
    fs.writeFileSync(SHOWS_PATH, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`Synced ${shows.length} followed shows.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
