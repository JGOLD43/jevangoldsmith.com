#!/usr/bin/env node
// Enrich data/movies.json with TMDB metadata (runtime, genres, overview, backdrop, tmdbId).
// Idempotent: skips entries already enriched unless --force is passed.
// Usage:
//   TMDB_API_KEY=xxxx node scripts/enrich-movies.js
//   node scripts/enrich-movies.js --force        # re-fetch everything
//   node scripts/enrich-movies.js --only="Title" # enrich a single title

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MOVIES_PATH = path.join(ROOT, 'data', 'movies.json');
const ENV_LOCAL = path.join(ROOT, '.env.local');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const RATE_LIMIT_MS = 30; // ~33 req/sec, well under TMDB's 50/sec cap

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

function parseArgs(argv) {
    const args = { force: false, only: null };
    for (const arg of argv.slice(2)) {
        if (arg === '--force') args.force = true;
        else if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
    }
    return args;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbGet(pathname, params, apiKey) {
    const url = new URL(TMDB_BASE + pathname);
    url.searchParams.set('api_key', apiKey);
    for (const [k, v] of Object.entries(params || {})) {
        if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 429) {
        const retry = Number(res.headers.get('retry-after') || 2);
        console.warn(`  rate-limited, sleeping ${retry}s`);
        await sleep(retry * 1000);
        return tmdbGet(pathname, params, apiKey);
    }
    if (!res.ok) {
        throw new Error(`TMDB ${pathname} → ${res.status} ${res.statusText}`);
    }
    return res.json();
}

async function findMovie(title, year, apiKey) {
    const search = await tmdbGet('/search/movie', {
        query: title,
        year: year || undefined,
        include_adult: 'false',
        language: 'en-US'
    }, apiKey);
    if (search.results && search.results.length > 0) return search.results[0];
    if (year) {
        const fallback = await tmdbGet('/search/movie', {
            query: title,
            include_adult: 'false',
            language: 'en-US'
        }, apiKey);
        if (fallback.results && fallback.results.length > 0) return fallback.results[0];
    }
    return null;
}

async function fetchDetail(tmdbId, apiKey) {
    return tmdbGet(`/movie/${tmdbId}`, { language: 'en-US' }, apiKey);
}

function isEnriched(movie) {
    return typeof movie.runtime === 'number' && movie.runtime > 0 && movie.tmdbId;
}

async function main() {
    loadEnvLocal();
    const args = parseArgs(process.argv);
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
        console.error('TMDB_API_KEY not set. Add to .env.local or pass via env.');
        console.error('  Get a free key at https://www.themoviedb.org/settings/api');
        process.exit(1);
    }

    if (!fs.existsSync(MOVIES_PATH)) {
        console.error(`movies.json not found at ${MOVIES_PATH}`);
        process.exit(1);
    }

    const movies = JSON.parse(fs.readFileSync(MOVIES_PATH, 'utf8'));
    if (!Array.isArray(movies)) {
        console.error('movies.json is not an array');
        process.exit(1);
    }

    let enriched = 0;
    let skipped = 0;
    let unmatched = 0;
    const unmatchedTitles = [];

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        if (args.only && movie.title !== args.only) continue;
        if (!args.force && isEnriched(movie)) {
            skipped++;
            continue;
        }
        process.stdout.write(`[${i + 1}/${movies.length}] ${movie.title} (${movie.year || '?'}) … `);
        try {
            const match = await findMovie(movie.title, movie.year, apiKey);
            if (!match) {
                console.log('no match');
                unmatched++;
                unmatchedTitles.push(`${movie.title} (${movie.year || '?'})`);
                continue;
            }
            const detail = await fetchDetail(match.id, apiKey);
            movie.tmdbId = detail.id;
            movie.runtime = detail.runtime || 0;
            movie.tmdbGenres = (detail.genres || []).map((g) => g.name);
            movie.overview = detail.overview || null;
            movie.backdrop = detail.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}`
                : null;
            console.log(`${movie.runtime}min · ${(movie.tmdbGenres || []).join(', ') || '—'}`);
            enriched++;
            await sleep(RATE_LIMIT_MS);
        } catch (err) {
            console.log(`error: ${err.message}`);
        }
    }

    fs.writeFileSync(MOVIES_PATH, `${JSON.stringify(movies, null, 2)}\n`);
    console.log('');
    console.log(`Done. enriched=${enriched} skipped=${skipped} unmatched=${unmatched}`);
    if (unmatchedTitles.length) {
        console.log('Unmatched (consider manual tmdbId override):');
        for (const t of unmatchedTitles) console.log(`  - ${t}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
