# JGOLD GitHub-only automatic publishing plan

## Outcome

JGOLD automatically moves only an explicitly approved public copy from the Samsung phone to the live website. Private finances, photos, files, notes, reading activity, highlights, book files, and essay revision history remain inside the encrypted app database and never enter the publishing pipeline.

## Architecture

1. The app constructs a narrow `PublishManifest` containing only allowlisted public fields.
2. The approved manifest is saved to the encrypted on-device outbox before any network request.
3. JGOLD submits an immutable JSON envelope to the private `JGOLD43/jgold-publishing-inbox` repository using a fine-grained GitHub token restricted to that repository and `Contents: read/write`.
4. The phone cannot write to `JGOLD43/jevangoldsmith.com`, its workflows, Pages deployment, or source code.
5. Every five minutes, the trusted `jgold-publish-sync` workflow in the website repository checks out the inbox with a read-only deploy key.
6. The trusted sync script treats inbox files as hostile data. It rejects unknown fields, invalid types, oversize values, unsafe identifiers, replayed job IDs, unsupported clients, and future timestamps. It escapes HTML before producing public markup.
7. The workflow runs content validation and security tests, commits only allowlisted `data/` changes plus its receipt ledger, and pushes to `main`.
8. The existing test workflow gates the existing GitHub Pages deployment. If validation, build, smoke, or browser tests fail, the public website is not deployed.
9. The app reads the deployed public JSON feeds as it already does, so website-originated changes and Letterboxd updates flow back into the app without private data synchronization.

## Automation behavior

- Pressing Publish is the explicit privacy boundary. Saving, autosaving, editing, importing, highlighting, or marking a book as currently reading does not publish anything.
- If online, the approved copy is submitted immediately.
- If offline or GitHub is unavailable, the encrypted outbox retries when JGOLD opens, whenever it returns to the foreground, and every minute while unlocked and active.
- GitHub processes inbox submissions on a five-minute schedule. A successful website commit triggers the existing full test and deployment chain.
- Duplicate retries are idempotent: the app uses a content hash in the submission identity and the website maintains a committed receipt ledger.

## Security controls

- Repository isolation: compromise of the phone token cannot change website code.
- Least privilege: the phone token is limited to one private inbox repository and has no workflow permission.
- Secret separation: the website's inbox deploy key is read-only and exists only as a GitHub Actions secret.
- Strict contracts: exact-key validation prevents private-shaped or additional fields from crossing the boundary.
- Stored-XSS prevention: app text is HTML-escaped by trusted website code, never trusted as markup.
- Replay protection: a job ID cannot be reused with different bytes.
- Resource limits: 300 KB per submission, 250 files per run, and per-field length/range limits.
- Trusted execution: no code, package, script, or workflow from the inbox is executed.
- Supply-chain hardening: security-critical workflow actions are pinned to full commit SHAs.
- Deployment gating: generated public data must pass validation and publication security tests before commit; the website must then pass its normal test pipeline before Pages deployment.
- Device protections: token and encrypted database key use Android SecureStore/Keystore with this-device-only access; Android backup remains disabled.

## Initial setup and operation

1. Create a fine-grained GitHub token with a short expiry.
2. Select only `JGOLD43/jgold-publishing-inbox` under repository access.
3. Grant only `Contents: Read and write`; do not grant Workflows, Administration, Actions, Secrets, or access to `jevangoldsmith.com`.
4. Paste it into JGOLD Settings and press **Connect and verify**.
5. Rotate it from GitHub and reconnect the app before expiry. Revoke it immediately if the phone is lost, rooted, or compromised.

## Verification and maintenance

- Run `node --test tests/unit/jgold-publishing.test.js` for the trusted boundary tests.
- Run `npm run content:validate` after any schema change.
- Run `npm run --prefix private-companion-app verify` for the app privacy architecture and type checks.
- Review the `jgold-publish-sync` workflow failures and rejected receipt reasons.
- Review and rotate the phone token every 90 days.
- Review the deploy key annually or immediately after any GitHub account incident.
- Keep the inbox private. The app's connection verification rejects a public inbox.

## Residual risks

- A compromised unlocked or rooted phone may steal the inbox token and submit allowlisted public content. Isolation and validation prevent website-code takeover, but an attacker could still deface public content within the allowed schema until the token is revoked.
- GitHub availability controls publishing latency. The encrypted outbox preserves approved work during outages.
- GitHub scheduled workflows are not guaranteed to begin at an exact minute; normal publication delay is approximately five minutes plus website tests/deployment.
- This architecture deliberately does not synchronize private data. Cross-device private backup would require a separate, end-to-end encrypted design and is outside this pipeline.
