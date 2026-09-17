# Public résumé

The résumé is at `/resume.html`, linked from Experiences in the header and footer.
Its content lives in `site-astro/src/data/resume.ts`; the profile and interest text
are in `site-astro/src/pages/resume.astro`.

The source is the December 2025 résumé, supplemented by the 3 December 2025
email describing approximately 24 months of part-time trade assistant work and
around 40 full bathroom renovations. No exact employment dates or additional
trade qualifications were supplied. Employment marked ongoing is explicitly
dated to December 2025. Confirm newer information before changing that status.

`site-astro/public/downloads/jevan-goldsmith-resume-2025.pdf` is the unchanged
original PDF. The web page includes the additional trade experience; the PDF
does not. When replacing the PDF, update its URL and download label in the résumé
data and both pages, and update the displayed file size.

## Email delivery

The email form uses the site's existing FormSubmit recipient,
`hello@jevangoldsmith.com`. Its autoresponse contains the public PDF download URL
and the interactive page URL. It emails a link, not a PDF attachment. The
request is also sent to Jevan. Email addresses are not added to a mailing list.

Keep this a native POST with FormSubmit's default reCAPTCHA enabled. Do not add
`data-contact-form`, switch to `/ajax/`, or disable `_captcha`: any of those would
prevent the autoresponse. See [FormSubmit documentation](https://formsubmit.co/documentation).
The existing recipient must be activated with FormSubmit; if the provider sends
an activation email, its mailbox owner must complete activation.

After the provider accepts a request it returns to `/resume-requested.html`,
which is excluded from indexing and the sitemap. That page gives a direct
download fallback and does not claim inbox delivery has been verified.

## Verification

Run the normal site build and checks. The smoke harness includes the résumé.
Check desktop and mobile navigation, each work filter, individual role expansion,
Expand/Collapse all, direct role links, PDF download and the email form's browser
validation. Content, disclosures and download links work without JavaScript.

Test email submission without sending by intercepting the outbound FormSubmit
POST in the browser, checking `_autoresponse`, `email` and `_next`, and following
the return page. A real delivery test separately requires an authorised recipient
and confirmation of receipt; a successful form submission alone is not proof of
inbox delivery.
