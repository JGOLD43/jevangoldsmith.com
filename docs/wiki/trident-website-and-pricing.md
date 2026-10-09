# Trident’s website and pricing

The Trident page at `/theon/` explains one concrete use: returning to a project with the next step, draft and reference ready. The black-and-white identity, focused navigation, illustrated walkthrough and compact offers take visual inspiration from [One](https://getone.one/#pricing); the copy, product and implementation are Trident’s own. The historical route remains compatible with existing links and the plugin catalogue.

## The first offer

The starting audience is independent builders and freelancers who repeatedly reconstruct interrupted work. This is a hypothesis, not a confirmed audience or evidence of demand. The public page offers free self-building and proposed paid convenience, setup and support. It does not charge, reserve a licence, register a waitlist or manufacture testimonials.

| Proposal | Monthly Pro | Annual Pro | Founding licence |
| --- | ---: | ---: | ---: |
| Accessible | US$8 | US$69 | US$129 |
| Balanced starting hypothesis | US$12 | US$99 | US$199 |
| Higher value | US$18 | US$149 | US$299 |

Annual billing shows its monthly equivalent alongside the actual annual amount. For example, US$99/year is US$8.25/month, a rounded 31% saving compared with twelve US$12 payments. The founding proposal keeps the purchased major version and includes the first year of updates and support. It avoids an unlimited lifetime maintenance commitment. Final fulfilment and terms remain undecided; all paid features are proposed.

AI access is separate. These prices include no model allowance, tokens or third-party subscription. The original MIT source remains available, with dependency notices and imported-content rights kept separate.

## Try a price without changing everyone’s page

The page defaults to the balanced offer. `?offer=entry`, `?offer=standard` and `?offer=premium` select a consistent named proposal. Unknown values fall back to standard. There is no random allocation, visitor tracking, external form submission or browser storage. Copying an offer only copies text; a visitor must choose to submit any feedback in GitHub Discussions.

The local tool in `tools/trident-pricing-lab/` reads the same price definitions. Serve the repository locally on port 8944 and the public assets on port 8943, then open `/tools/trident-pricing-lab/` on the first server. The tool is outside the published assets and is not copied into the public website build.

For 1,000 hypothetical qualified visitors, 2% conversion, an even monthly/annual split, US$2 monthly cost per subscriber and US$100 fixed monthly costs, the balanced proposal yields 20 hypothetical subscribers and US$202.50 normalised monthly revenue. Subtracting only those entered costs leaves US$62.50. That is arithmetic from assumptions, not a forecast or profit claim. Annual cash arrives on a different schedule. Acquisition, fees, tax, refunds, churn and Jevan’s time are absent unless otherwise entered; one-time revenue is shown separately from recurring revenue.

## Learn whether anyone wants it

Keep the same explanation and audience while comparing price responses. Retain the exact offer, source, date and the prospective user’s own reason. A copied message, visit or stated interest is weaker evidence than a purchase. Do not turn them into sales.

After distribution and payment handling are ready, check completed purchases, successful setup, a return to a real project and support effort. Five conversations can uncover confusion; they cannot establish a reliable conversion rate. A price that attracts users but takes too much support may be less useful than a higher price that supports dependable delivery.

Before collecting money, finish public Mac notarization and distribution review, define support/update scope and final terms, connect real hosted checkout and verify fulfilment and failed/cancelled payment recovery. Those workflows are not implemented by this marketing page. Outreach and purchases are separate actions.

## Release and review

The website belongs in this repository and uses the existing GitHub Pages workflow. The Mac app, private workspace and Android release are separate. The shipping page keeps its existing rendering and data; its display name and icon now use Trident.

Local browser checks and the production build establish that this page works locally. A PR is review, not a public release. The custom domain must serve the expected change after the existing deployment succeeds before publication can be claimed. The active website workflow includes unit suites; Jevan’s no-unit-test instruction prevents triggering it for this task. A `[skip ci]` commit preserves that boundary and leaves any required checks pending. No check is forged, no repository setting is changed and no agent merges.
