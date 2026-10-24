# Trident website and pricing acceptance evidence

Scope: the existing static `/theon/` marketing page, its display identity on the shipping page, and an unpublished local pricing comparison tool. This record contains fictional demonstration content and illustrative price assumptions only.

## Observed locally

- `npm run build:fast` passed on the isolated latest-main checkout: asset integrity, production CSS validation, performance budgets (89.1 MB for the whole site) and generated per-page CSP. No unit suites were invoked. All three changed/new JavaScript entry points passed syntax checks.
- Desktop browser renders the Trident identity, product explanation and three-step fictional resume illustration without horizontal overflow. Scene selection shows a changed heading, action and stopping note.
- Standard annual offer shows US$99/year and US$8.25/month equivalent. Monthly selection shows US$12/month. The corresponding dialog preserves the chosen amount and identifies it as a proposal. Copying shows a visible receipt; Escape closes and returns focus to Explore Pro.
- Entry variant shows US$69/year, US$5.75/month equivalent and US$129 once. Premium production-build variant shows US$149/year, US$12.42/month equivalent and US$299 once, including the full founding-licence scope in the dialog. Unknown variants fall back to the standard offer.
- A 390 × 844 local iframe rendered the actual page's phone CSS. Its document reported 375px client width and 375px scroll width after the scrollbar; pricing cards stack and controls remain visible. This is browser reflow evidence, not a physical-device check. The in-app viewport override did not initially alter the existing tab; it was reset.
- Writing plugin filtering leaves Scratchpad visible. Catalogue copying reports success and retains the canonical URL.
- The production shipping page uses its retained stylesheet, new name/icon and existing data logic. It renders 20 retained outcomes. The remote refresh is unavailable and the page explicitly retains its 7 October evidence; live freshness is not claimed. Its browser log reported no warnings/errors.
- The local lab's balanced defaults show 20 hypothetical subscribers, US$202.50 monthly-normalised revenue, US$62.50 after entered costs and 13 subscribers to cover those costs. Zero conversion shows zero revenue and the US$100 fixed cost. US$30 monthly cost per subscriber explicitly shows no break-even at these costs. One-time receipts remain separate from recurring revenue.
- Production landing-page browser logs reported no warnings/errors. Generated builds and review screenshots remain ignored and are not committed.

## Unperformed and pending

The active website workflow includes unit suites. Jevan's standing instruction prohibits creating, expanding or running unit tests for this task, including triggering that workflow. The commit uses `[skip ci]`; required checks remain pending, not passed. No workflow configuration or repository settings were changed. No agent merges.

The page has not reached main or been deployed/verified on the custom domain. No signed Mac package, public/notarized app release, checkout, payment, waitlist registration, analytics, customer outreach, sales or demand validation occurred. Paid features and licence/support terms remain proposed.

## Risk and rollback

The main risks are whether the audience recognises the benefit and whether paid support can be delivered economically. The local lab does not establish either. The founding proposal deliberately limits included support/updates to the first year while retaining the purchased major version. AI costs stay separate.

Reverting this website commit restores the former landing page and shipping-page presentation. Existing app/private stores, immutable plugin catalogue/bundles, shipping observations, website hosting and Android releases are unchanged. After review, release through the existing GitHub Pages path only, with its policy conflict resolved by Jevan and the custom domain checked against the accepted change.
