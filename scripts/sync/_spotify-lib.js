// Shared Spotify helpers used by spotify-capture-episode.js and
// spotify-sync-shows.js. Phase 12 consolidated the token-refresh + fetch
// boilerplate that lived in both scripts (~50 duplicated LOC) into one
// place so a Spotify API change only needs touching once.

'use strict';

/**
 * Refresh the access token using the long-lived refresh token.
 * Throws with `.revoked = true` on 400 invalid_grant so callers can surface
 * "go re-run spotify-oauth-helper.js" without crashing CI.
 */
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

/**
 * GET a Spotify Web API endpoint with an access token. Returns the parsed
 * JSON, or `null` for 204/429 (rate-limited callers should skip this poll).
 */
async function spotifyFetch(url, accessToken, { skipOn204 = true } = {}) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (skipOn204 && res.status === 204) return null;
  if (res.status === 429) {
    console.warn('Spotify rate-limited; skipping this poll');
    return null;
  }
  if (!res.ok) {
    throw new Error(`Spotify GET ${url} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Read SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET + SPOTIFY_REFRESH_TOKEN from
 * process.env (already populated by dotenv). Throws with a clear error if any
 * are missing, so CI failures point at the missing secret instead of a
 * confusing "undefined refresh_token" 400 from Spotify.
 */
function readSpotifyEnv() {
  const required = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing Spotify env vars: ${missing.join(', ')}. Set them in .env.local or GitHub Secrets.`);
  }
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
  };
}

module.exports = { refreshAccessToken, spotifyFetch, readSpotifyEnv };
