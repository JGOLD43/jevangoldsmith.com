# Decision Log

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `record architectural decisions that future maintainers should not rediscover`

## Decisions

### Use Firebase Hosting For Static Runtime

The public site is static and hosted on Firebase Hosting. This keeps the runtime
simple, reliable, and low-maintenance.

### Deploy From `dist/`

Firebase Hosting serves generated `dist/` output instead of the source root.
This separates authored files from deployed files and makes future build-system
migration safer.

### Keep Root HTML As Transitional Source

Root `.html` files remain the current source while the project migrates toward
`site-astro/src/pages/`. This avoids a risky all-at-once rewrite.

### Self-Host Leaflet

Leaflet is vendored under `vendor/leaflet/` so adventure maps do not depend on
`unpkg.com` at runtime and CSP can remain tighter.

### Keep `unsafe-inline` Temporarily

The current public pages still contain inline handlers, inline scripts, and page
style blocks. CSP keeps `unsafe-inline` until those are removed safely.

### Exclude Admin From Public Hosting

`admin/` remains source-only until write-capable admin behavior is protected by
a server-enforced API. Client-side 2FA is not a backend authorization boundary.
