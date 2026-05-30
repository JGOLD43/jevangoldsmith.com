# Content admin (Sveltia CMS) — setup

The site has a git-backed admin UI at **`/admin`** (Sveltia CMS, Decap-compatible).
It edits the JSON files in `data/` directly through the GitHub API and commits
to `main` — there is no backend server. It's a static page (`site-astro/public/admin/`)
that ships with the site.

Status: **the UI is built and verified** (it loads at `/admin` and shows the
sign-in screen). Pick ONE of the three sign-in methods below — the first two
need **no Cloudflare Worker and no OAuth App**.

---

## Accessing the admin page

- **Live site:** `https://jevangoldsmith.com/admin` (redirects to `/admin/`). Only
  exists once the branch is deployed.
- **Local dev (`npm run dev`):** use **`http://localhost:4321/admin/index.html`**
  — the bare `/admin` path 404s under the dev server (it doesn't auto-serve the
  directory index; the built/production site handles `/admin` fine via redirect).

## Option A — Local Repository (zero setup, best for trying it)

On the sign-in screen, click **"Work with Local Repository"** and pick
this repo's folder on disk. The CMS edits your local `data/*.json` files
directly (via the browser's File System Access API, Chrome/Edge). You then
`git commit` + `git push` the changes yourself. No tokens, no servers.

Great for seeing the forms and adding content locally before deciding on a
live-editing method.

## Option B — Access Token (simplest live editing, recommended)

Lets you edit the live GitHub repo from the `/admin` page with **no Worker**.

1. GitHub → Settings → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → Generate.
   - Repository access: only `JGOLD43/jevangoldsmith.com`
   - Permissions: **Contents: Read and write**
2. On `/admin`, click **"Sign In Using Access Token"** and paste it.

That's it — the forms now read/write the live repo and commit to `main`.
(Token lives in your browser; regenerate/revoke anytime.)

## Option C — GitHub OAuth (edit from any device, no token pasting)

The "proper" production flow — a one-click "Sign In with GitHub" button — but it
needs a tiny auth relay because GitHub's OAuth flow requires a server. Only do
this if Option B's token-paste bugs you.

### C1. Create a GitHub OAuth App

GitHub → Settings → **Developer settings** → **OAuth Apps** → **New OAuth App**:

- **Application name:** `jevangoldsmith.com CMS`
- **Homepage URL:** `https://jevangoldsmith.com`
- **Authorization callback URL:** `https://<your-auth-worker>.workers.dev/callback`
  (you'll get this exact URL in step 2 — come back and paste it)

Save. Note the **Client ID**, and generate a **Client Secret**.

### C2. Deploy the auth relay (Cloudflare Worker)

GitHub's OAuth web flow needs a tiny server to exchange the code for a token.
Sveltia provides one — `sveltia-cms-auth` — that runs free on Cloudflare Workers.

```bash
# one-time
npm i -g wrangler
git clone https://github.com/sveltia/sveltia-cms-auth
cd sveltia-cms-auth
wrangler deploy
# then set the secrets (from step 1):
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
# optional but recommended — lock it to your site:
wrangler secret put ALLOWED_DOMAINS   # value: jevangoldsmith.com
```

`wrangler deploy` prints your Worker URL (e.g. `https://sveltia-cms-auth.<you>.workers.dev`).
Put `/callback` on the end and paste that back into the OAuth App's callback URL (step 1).

### C3. Point the CMS at your Worker

In `site-astro/public/admin/config.yml`, set:

```yaml
backend:
  name: github
  repo: JGOLD43/jevangoldsmith.com
  branch: main
  base_url: https://sveltia-cms-auth.<you>.workers.dev   # ← your Worker, no /callback
```

Commit, let it deploy, then open `https://jevangoldsmith.com/admin` and
**Log in with GitHub**.

---

## ⚠️ Before you trust it: test a throwaway save

Decap/Sveltia write back **only the fields defined in `config.yml`** — a missing
field is deleted from the JSON on save. The config is enumerated to match the
data exactly, but verify once: in the CMS, add a dummy **Challenge** (or essay),
save, then look at the commit it created on GitHub. Confirm the diff only adds
your new entry and doesn't strip fields from neighbours. Delete the dummy after.

## What you can edit in the CMS

Essays, Podcasts, People, Challenges, and **Trips** (adventures — including the
photo gallery and map center). Each collection shows as one item (e.g. "All
trips"); open it and use the list's **+** to add an entry. Every field is
enumerated in the config so saves never drop data.

**Not in the CMS (by design):**
- **Books, Movies** — these files are a bare top-level JSON array
  (`[ {...}, {...} ]`), which Decap/Sveltia can't edit as a form without
  restructuring the file into `{ "books": [...] }` (a change that touches the
  content loader, the cover generator, and the validator). Books also arrive via
  bulk import and movies via the Letterboxd cron, so for now use
  `npm run new:book` + editor autocomplete, or let the cron handle movies. If you
  want Books in the CMS, it's a one-time wrap migration — ask and it can be done.
- **Projects** — the build-documentary structure (proof artifacts, build log,
  commentary, links) is deeply nested; left on `npm run new:project` for now.

## Cleanup

The old `admin/` folder at the repo root is a dead localStorage-only stub (not
deployed). Once this CMS works, delete it to avoid confusion:
`git rm -r admin`.

## Lower-setup alternative

If the Worker step is more than you want, **Pages CMS** (pagescms.org) needs no
OAuth App or Worker — you install their GitHub App and edit at app.pagescms.org
with a `.pages.yml` config. Trade-off: editing happens on their hosted site
rather than your own `/admin`.
