# Admin Security Hardening Plan

Status: `proposed`
Audience: `engineering`
Purpose: `move admin write authorization out of the browser`

## Why this exists

`ARCHITECTURE.md` calls out the gap explicitly:

> The admin UI still runs in the browser. Do not treat client-side
> two-factor checks as a backend authorization boundary. Any future
> write-capable admin actions should move behind Cloud Functions or
> another server-side API that verifies Firebase ID tokens and second-
> factor state before writing data.

Today `firestore.rules` allows any request authenticated as the admin
email to read/write `/admin/**` directly from the browser. The 2FA
gate (`admin/js/twofa.js`, `admin/js/totp.js`) is enforced only in
client JS. A user who bypasses that JS gate (DevTools, browser cookie
replay, malicious extension) can write Firestore as if 2FA passed.

## Target architecture

```
[ Admin UI (browser) ]
      |
      |  fetch('/api/admin/<action>', { Authorization: Bearer <idToken> })
      v
[ Cloud Function ]
      |
      |  verify ID token (Firebase Admin SDK)
      |  verify token has custom claim mfa.verified === true
      |  verify email is in admin allowlist
      |
      v
[ Firestore Admin SDK write ]
      |
      v
[ /admin/** documents ]
```

Firestore rules become:

```
match /admin/{document=**} {
  allow read, write: if false;  // only Admin SDK (Cloud Functions) can touch this
}
```

End-user-authenticated browsers can still call the function, but cannot
write Firestore directly. The custom claim `mfa.verified` is set by a
companion `verify-2fa` function that the existing TOTP flow calls; the
claim has a short TTL (e.g. 4 hours) and the function checks `auth_time`
against that window.

## Phased delivery

### G.1 — Cloud Functions skeleton (1 day)
- Create `functions/` package with TypeScript or JS, your choice.
- Wire `firebase.json` rewrites:
  ```json
  "rewrites": [
    { "source": "/api/admin/**", "function": "adminApi" }
  ]
  ```
- Add `functions/src/verifyAdmin.ts`:
  ```ts
  export async function verifyAdmin(req: Request): Promise<DecodedIdToken> {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new Error('missing-bearer');
    const decoded = await admin.auth().verifyIdToken(match[1], true);
    if (decoded.email !== ADMIN_EMAIL) throw new Error('not-admin');
    if (decoded.mfa?.verified !== true) throw new Error('mfa-required');
    if (decoded.auth_time < Date.now()/1000 - 4*3600) throw new Error('mfa-stale');
    return decoded;
  }
  ```
- Add health probe `GET /api/admin/whoami` that returns the verified
  identity. Use this to validate the verification flow before moving
  any writes.

### G.2 — Move 2FA to a server-issued claim (1 day)
- Add `verify-2fa` callable function: takes a TOTP code, verifies it
  against the stored shared secret (currently in `admin/js/totp.js`
  client logic; move secret to Functions config), and on success calls
  `admin.auth().setCustomUserClaims(uid, { mfa: { verified: true,
  verifiedAt: Date.now() }})`.
- Frontend (`admin/js/twofa.js`) refactored to call the function and
  refresh the ID token (`getIdToken(true)`) after success.
- Remove client-side TOTP verification (no longer trusted). Keep the
  UI flow the same.

### G.3 — Migrate writes one collection at a time (2-3 days)
- Per-collection write functions in Cloud Functions: `addBook`,
  `updateBook`, `deleteBook`, etc. Validate payload shape using the
  same schemas you'd export from `scripts/check/harness.js`
  (`validateCollection`).
- Frontend swap: `admin/js/dashboard-books.js` and friends replace
  `firebase.firestore().collection('admin').doc(...)` calls with
  `fetch('/api/admin/books/add', { ... })`.
- One commit per collection migrated.

### G.4 — Lock down Firestore rules (30 min)
After every admin write goes through Cloud Functions:

```
match /admin/{document=**} {
  allow read, write: if false;
}
```

Functions still write via Admin SDK, which bypasses rules.

### G.5 — Verify (half day)
- Pen-test 1: try `firestore.collection('admin').add({})` from authenticated
  browser console. Expected: PERMISSION_DENIED.
- Pen-test 2: call `/api/admin/books/add` with a stale token (auth_time
  > 4hrs old). Expected: 403 mfa-stale.
- Pen-test 3: call `/api/admin/books/add` with a valid token but no
  `mfa.verified` claim. Expected: 403 mfa-required.
- Pen-test 4: call `/api/admin/books/add` from a non-admin user. Expected:
  403 not-admin.
- Update `ARCHITECTURE.md` to remove the "Future write-capable admin
  actions should move..." paragraph; reference this doc instead.

## Out of scope

- Admin UI redesign. Function endpoints replace direct Firestore writes
  but the UI stays.
- Audit logging. Functions log via Cloud Logging by default; add
  structured per-write log lines if needed later.
- Rate limiting. Functions cold-start protects against most abuse;
  Firebase App Check is the next step if abuse becomes real.

## Risks

- **Cold start latency**: Functions add 1-3s on cold start. Acceptable
  for admin (rarely used) but profile after deploy.
- **2FA secret migration**: if the TOTP secret is currently embedded
  in client JS, it must be rotated when moved to Functions config —
  the old secret leaked the moment it was in browser-readable code.
- **Dependency on Functions billing**: free tier is generous for admin
  use, but watch invocation counts.

## Next step

Open a `feat/admin-functions` branch and start G.1. Do not begin G.4
until G.1-G.3 are deployed and pen-tested in staging.
