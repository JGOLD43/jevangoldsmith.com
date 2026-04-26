# Admin Dashboard

Source for the private browser-based admin interface.

The admin app is intentionally excluded from public Firebase Hosting deploys. It
is useful as a local/content operations tool, but it is not a server-enforced CMS.
Do not treat client-side authentication or client-side two-factor checks as a
backend security boundary.

## Current Shape

- `index.html` owns the login screen.
- `dashboard.html` owns the admin workspace.
- `css/admin.css` owns admin styling.
- `js/auth.js`, `js/totp.js`, and `js/twofa.js` own client-side auth helpers.
- `js/dashboard.js` owns dashboard navigation and content screens.
- `js/bookImporter.js` and `js/essayImporter.js` import/export content JSON.
- `js/settings.js` owns account/settings UI.
- `js/firebase-config.js` owns Firebase client configuration.

## Content Workflow

The admin tools help prepare JSON updates. Publishing still happens through the
repository:

1. Use the dashboard importer/exporter for the relevant content type.
2. Replace the matching file in `data/`.
3. Run `npm run check`.
4. Commit and deploy through the normal site release flow.

## Security Notes

Firestore rules only allow the configured admin email to access `/admin/**`.
The browser UI also performs local checks, but those checks are advisory. Any
future production write path should move behind Cloud Functions or another
server-side API that verifies Firebase ID tokens and second-factor state before
writing data.

## File Structure

```text
admin/
├── index.html
├── dashboard.html
├── css/
│   └── admin.css
├── js/
│   ├── auth.js
│   ├── bookImporter.js
│   ├── dashboard.js
│   ├── essayImporter.js
│   ├── firebase-config.js
│   ├── settings.js
│   ├── totp.js
│   └── twofa.js
└── README.md
```

## Cleanup Notes

The retired TinyMCE essay editor and media manager were removed because the
current dashboard does not load them and their target DOM no longer exists.
