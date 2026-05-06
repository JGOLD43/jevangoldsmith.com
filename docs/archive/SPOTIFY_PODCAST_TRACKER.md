# Spotify Podcast Tracker

Pulls your podcast listening history and followed shows from Spotify into the
podcasts page. Runs entirely on GitHub Actions — no Firebase, no servers, no
ongoing cost.

## What it does

- **Hourly**: polls Spotify for the currently-playing episode. If it's a
  podcast and not a duplicate of the most recent log entry, appends to
  `data/podcast-episodes.json` and commits.
- **Monthly** (1st of month, 03:00 UTC): snapshots followed shows to
  `data/podcast-shows.json` and commits.
- The podcasts page reads both JSON files and renders Spotify sections above
  the curated picks.

## Files

- `scripts/spotify-oauth-helper.js` — one-time local script to obtain refresh token
- `scripts/spotify-capture-episode.js` — hourly capture, called by Action
- `scripts/spotify-sync-shows.js` — monthly sync, called by Action
- `.github/workflows/spotify-capture-episodes.yml` — hourly workflow
- `.github/workflows/spotify-sync-shows.yml` — monthly workflow
- `data/podcast-episodes.json` — append-only log (capped at 500 most recent)
- `data/podcast-shows.json` — followed shows snapshot

## One-time setup

### 1. Create a Spotify app

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **Create app**
   - App name: `Jevan Personal Podcast Tracker` (anything works)
   - App description: `Personal site integration`
   - Redirect URI: `http://127.0.0.1:8888/callback` (exact, no trailing slash)
   - Which API/SDKs are you planning to use: **Web API**
4. Save → click **Settings**
5. Copy the **Client ID**
6. Click **View client secret** → copy the **Client secret**

### 2. Get a refresh token (one-time, runs locally)

Create `.env.local` in the repo root (already gitignored):

```
SPOTIFY_CLIENT_ID=<your client id>
SPOTIFY_CLIENT_SECRET=<your client secret>
```

Run:

```
node scripts/spotify-oauth-helper.js
```

It will:
- Open your browser to Spotify
- Ask you to authorize the app
- Catch the callback
- Print a **refresh token** to your terminal

Copy that refresh token.

### 3. Add secrets to GitHub

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add three secrets:

| Name | Value |
|---|---|
| `SPOTIFY_CLIENT_ID` | from step 1 |
| `SPOTIFY_CLIENT_SECRET` | from step 1 |
| `SPOTIFY_REFRESH_TOKEN` | from step 2 |

### 4. Trigger the workflows manually to verify

Repo → **Actions** tab.

- Run **Spotify - Sync Followed Shows** manually (Run workflow button). This
  should populate `data/podcast-shows.json` and commit.
- Start playing a podcast on Spotify, wait a minute, then run **Spotify -
  Capture Podcast Episodes** manually. Should log the episode and commit.

If either fails, GitHub will email you. Check the Action logs for the error.

After verification, both workflows run automatically on their schedule.

## Failure modes

| Failure | What happens | Fix |
|---|---|---|
| Refresh token revoked (e.g., Spotify password change, manual revoke at spotify.com/account/apps) | Capture script logs `invalid_grant` error and exits 0; episodes stop being logged | Re-run `node scripts/spotify-oauth-helper.js`, update `SPOTIFY_REFRESH_TOKEN` secret |
| Spotify API down | Workflow fails this run; retries next schedule | Nothing — self-heals |
| You listened but nothing was logged | Episode shorter than 1 hour and finished between polls; or you listened in a Private Session; or Spotify Connect device not registering | Inherent limitation. Capture rate is ~85-90%, not 100% |
| Workflow stops running after long inactivity | GitHub disables scheduled workflows in repos with no commits for 60 days | You commit regularly to this repo; not a real risk |
| Repo gets too many auto-commits | At most 1 commit per hour, only when episode actually changes. Realistic: 5-30 commits/month | If noisy, increase dedupe window in `spotify-capture-episode.js` |

## Cost

Public repo: GitHub Actions is unlimited for free.

If the repo is private: hourly + monthly = ~720 runs/month, ~30 sec each = ~6
hours/month. Free tier is 33 hours/month for private repos. ~18% used.

## Privacy

`data/podcast-episodes.json` is committed to the repo and served on the public
site. Anyone visiting the podcasts page can see what you've been listening to.
If you want to exclude specific shows, add a check in
`scripts/spotify-capture-episode.js` that skips any episode whose `showId` is
in an exclusion list, before the dedupe/append step.

## Removing an episode

Edit `data/podcast-episodes.json` directly and commit. The Action will not
re-add the same episode unless you re-listen and the dedupe window has passed.

## Manual trigger anytime

Both workflows have `workflow_dispatch` enabled — you can trigger either one
on demand from the Actions tab without waiting for the schedule.
