#!/usr/bin/env node
// One-time helper to obtain a Spotify refresh token for the podcast tracker.
// Run locally. Reads SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET from .env.local
// (or env). Opens a browser, catches the OAuth callback, prints the refresh
// token to the terminal. Copy the token into GitHub Secrets as
// SPOTIFY_REFRESH_TOKEN. Refresh tokens are long-lived; re-run only if
// revoked (password change, manual revoke at spotify.com/account/apps).
//
// Usage:
//   node scripts/sync/spotify-oauth-helper.js
//
// Prereqs:
//   1. Register a Spotify app at https://developer.spotify.com/dashboard
//   2. In the app settings, add redirect URI: http://127.0.0.1:8888/callback
//   3. Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-follow-read',
    'user-library-read'
].join(' ');

// Use dotenv to load .env.local. Scripts previously parsed it themselves
// (~25 LOC each duplicated four times); dotenv handles quoted values,
// comments, and escapes correctly out of the box.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
function loadEnvLocal() { /* no-op: dotenv.config() above already loaded vars */ }

function openBrowser(url) {
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start ""' : 'xdg-open';
    exec(`${cmd} "${url}"`, (err) => {
        if (err) {
            console.log('\nCould not open browser automatically. Open this URL manually:\n');
            console.log(url);
        }
    });
}

async function exchangeCode(code, clientId, clientSecret) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Token exchange failed: ${res.status} ${text}`);
    }
    return res.json();
}

async function main() {
    loadEnvLocal();
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.');
        console.error('Add them to .env.local and re-run.');
        process.exit(1);
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    const server = http.createServer(async (req, res) => {
        if (!req.url || !req.url.startsWith('/callback')) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const url = new URL(req.url, REDIRECT_URI);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Auth failed: ${error}`);
            console.error(`\nAuth failed: ${error}`);
            server.close();
            process.exit(1);
        }
        if (returnedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('State mismatch — possible CSRF.');
            console.error('\nState mismatch.');
            server.close();
            process.exit(1);
        }
        if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('No code returned.');
            server.close();
            process.exit(1);
        }

        try {
            const tokens = await exchangeCode(code, clientId, clientSecret);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Done.</h1><p>Refresh token printed in terminal. You can close this tab.</p>');
            console.log('\n=== SUCCESS ===');
            console.log('\nRefresh token (store this in GitHub Secrets as SPOTIFY_REFRESH_TOKEN):\n');
            console.log(tokens.refresh_token);
            console.log('\nAlso set in GitHub Secrets:');
            console.log('  SPOTIFY_CLIENT_ID     =', clientId);
            console.log('  SPOTIFY_CLIENT_SECRET = (the secret you already have)');
            console.log('\nDo NOT commit the refresh token to git.\n');
            server.close();
            process.exit(0);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Exchange failed: ${err.message}`);
            console.error(`\n${err.message}`);
            server.close();
            process.exit(1);
        }
    });

    server.listen(8888, '127.0.0.1', () => {
        console.log('Listening on http://127.0.0.1:8888');
        console.log('Opening browser for Spotify authorization...');
        openBrowser(authUrl.toString());
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
