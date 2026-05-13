# Sync Helpers

This folder holds provider-specific helpers that are run manually rather than
as part of the default build.

- `spotify-oauth-helper.js` prints the Spotify OAuth URL and exchanges the
  authorization code for refresh credentials.
- `spotify-sync-shows.js` syncs followed Spotify shows into local data.
- `spotify-capture-episode.js` captures episode metadata for one-off curation.
