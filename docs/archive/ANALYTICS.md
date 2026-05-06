# Analytics

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `define privacy-friendly measurement and local event debugging`

## Provider

The site uses a provider-neutral privacy endpoint model in `js/analytics.js`.
If a Plausible script is added later, the same events are forwarded to
`window.plausible`. Until an endpoint or provider token is configured, events
are stored locally for debugging and never leave the browser.

Provider config lives in `data/site.config.json` under `analytics`.

## Tracked

- page views
- CTA clicks through `data-analytics="cta"`
- contact clicks
- product outbound/interest clicks
- Shelf object opens and filters
- resource download/interest clicks
- outbound clicks
- newsletter submit attempts
- future search query and result-click events

## Not Tracked

- cross-site identity
- ad retargeting
- keystrokes
- full form contents
- precise location

## Debugging

Open the browser console and run:

```js
window.JGAnalytics.flushDebugEvents()
```

This returns locally queued events and clears the queue. Analytics must never
block navigation, form submission, or page rendering.
