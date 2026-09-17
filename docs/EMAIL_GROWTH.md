# Email growth setup and release status

The website now has one monthly newsletter promise, shared signup components, sample content, project build notes, contextual invitations, an editable weekly-review resource and discovery-source capture.

## Email delivery dependency

No email-provider credentials or existing provider integration were found in the repository, process environment or GitHub secret names. `data/newsletter.json` therefore retains the existing FormSubmit inbox delivery in `manual` mode. A successful request is explicitly described as a request delivered to Jevan, not as a confirmed subscriber or a sent confirmation email.

This is not a complete automated email-list implementation. Choose and connect the owner's email service before claiming that subscriber storage, confirmation, welcome automation or unsubscribe automation is active.

Configure the service using its documented public signup form or hosted endpoint. Keep API secrets on a trusted server or in the provider's account, never in a GitHub Pages bundle or this public repository. Update allowed form/connect origins in `scripts/update-csp-hashes.js` only for the selected service. Match hidden attribution fields to the provider's actual custom-field names, and configure confirmed-subscriber welcome triggers inside that account.

The `hosted` delivery mode permits a normal form POST and lets the provider handle validation, confirmation and the result page. Do not treat a client-side redirect or query parameter as proof that an address is subscribed.

## Content to configure

- [Welcome emails](newsletter/welcome-emails.md): immediate, day 3 and day 7.
- [Distribution drafts and measurement](newsletter/distribution.md).
- Public sample: `/updates/a-look-inside.html`.
- Editable resource: `/downloads/weekly-review.md`.

The pet-food business needs Jevan's public description, stage, reason for starting it and next milestone. The homepage currently reflects only the existing public Now update. No business milestones, customers, finances or photographs have been invented.

## Source ownership

- `data/newsletter.json`: newsletter promise and public form configuration.
- `NewsletterForm.astro` and `NewsletterSignup.astro`: shared accessible forms and contextual invitations.
- `newsletter.ts`: request handling and browser-session source capture.
- `newsletter-attribution.ts`: allowed campaign metadata and explicit response validation.
- `src/pages/api/v1/newsletter.json.ts`: generated public newsletter metadata; replaces the stale static copy.
- `sync-search-index.js`: refreshes authored page, project and newsletter records from their source data.

Attribution records source labels, the landing path and external referring hostname. It excludes arbitrary query strings, fragments and email addresses. It is saved only for the browser session. Prerendered pages do not claim to be the landing page before activation.

## Verification before activating an email provider

1. Confirm an actual owned test address is added to the intended list exactly once.
2. If double opt-in is enabled, verify the confirmation email and confirm the address.
3. Verify welcome delivery, resource link and expected sender.
4. Verify an existing subscriber does not re-enter the welcome sequence.
5. Verify unsubscribe stops subsequent delivery.
6. Verify source and campaign fields persist and provider reporting distinguishes submitted and confirmed addresses.

Local browser tests intercept all test submissions. They verify error, success and recovery behavior without sending test mail or enrolling other people.
