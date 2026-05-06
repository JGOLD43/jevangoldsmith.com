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
        const err = new Error(`Spotify token refresh failed (${res.status}): ${await res.text()}`);
        err.revoked = true;
        throw err;
    }
    if (!res.ok) {
        throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()).access_token;
}

async function fetchShowsPage(accessToken, offset) {
    const url = new URL('https://api.spotify.com/v1/me/shows');
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('offset', String(offset));
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.status === 429) {
        const retry = Number(res.headers.get('retry-after') || 5);
        console.warn(`Rate-limited, sleeping ${retry}s`);
        await new Promise((r) => setTimeout(r, retry * 1000));
        return fetchShowsPage(accessToken, offset);
    }
    if (!res.ok) {
        throw new Error(`shows fetch failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
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
    loadEnvLocal();
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        console.error('Missing Spotify credentials.');
        process.exit(1);
    }

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
