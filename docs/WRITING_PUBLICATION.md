# Writing publication

The website remains on GitHub Pages. Essays are the primary reader entry point; personal collections remain under Explore.

## Publishing

Use the existing JGOLD Studio essay workflow or update `data/essays.json`. No app manifest contract has changed. Records must have `status: published` and must not have `visibility: private` to appear. Each published essay generates `/essays/<id>.html`, an RSS item and an API item. Search records refresh at build time. Keep an essay's ID stable once published.

The homepage and Start Here use a small editorial selection in `site-astro/src/lib/essays.ts`. Review that selection as stronger pieces are published. Descriptions should explain what the reader can expect; do not label selections “popular” without evidence. Preserve old `/essays.html#<id>` links via the archive compatibility handler.

## Editorial routine to try for three months

Aim for six substantial pieces, roughly one every two weeks. Treat these as reporting prompts, not events that already happened:

1. A real decision from the business: options, constraint, choice, result and uncertainty.
2. A book idea actually tried: what changed and what did not.
3. A problem encountered while building something: the failed approach and the lesson.
4. A question about attention explored with a specific observation or experiment.
5. A disagreement with a familiar idea, including its strongest counterargument.
6. A follow-up prompted by a reader's question.

For each piece: gather firsthand details; develop one clear idea; check factual claims; remove generic claims; ask an early reader what they understood; publish; prepare a useful standalone excerpt for one existing social channel; include it in the monthly letter. Jevan supplies experiences, results and opinions. Do not invent these or schedule automated publication of unfinished work.

## Reader feedback

Use replies, repeat readers and subscriptions as early signals. Signup forms already record landing path, source and safe campaign tags. Use campaign labels such as `utm_source=linkedin&utm_medium=social&utm_campaign=essay-title` consistently. Track per essay: publication date, distribution channel, visits when available, signup requests, confirmed subscribers, replies and follow-up questions. A signup request is not proof of a confirmed subscriber. Review the results monthly, alongside whether the writing is enjoyable and sustainable.

## Newsletter delivery

`data/newsletter.json` is the shared promise and delivery configuration. The current FormSubmit integration sends a request to Jevan; list administration and monthly delivery remain manual. Do not claim an automated welcome email or verified inbox delivery. Browser tests mock provider responses and cover success, rejected payloads, network failures and attribution; they do not prove external inbox receipt. To automate delivery, connect Jevan's chosen provider and verify a real confirmation, subscriber record and unsubscribe flow using an address he provides for testing.

## Release checks

Build, type-check, run unit tests, smoke tests and browser tests. Verify standalone pages with JavaScript disabled; canonical/OG URLs; RSS/API/search links; legacy fragments; mobile navigation and signup errors. After a normal push to main, wait for the deploy-pages jobs and verify the custom domain.

## Homepage reference review — 23 September 2026

- Wait But Why (https://waitbutwhy.com/): featured article and distinctive publication identity, with email signup alongside the writing.
- Paul Graham (https://paulgraham.com/articles.html): a direct essay archive with suggested starting points.
- James Clear's 3-2-1 (https://jamesclear.com/3-2-1): explains the format, frequency and signup before the archive.
- Experimental History (https://www.experimental-history.com/): publication image, succinct editorial promise and signup.
- Astral Codex Ten (https://www.astralcodexten.com/): current articles and an archive.

Decision: work mode leads with a featured essay preview; personal mode and About retain the portrait. This is an editorial judgement, not a measured conversion claim. Measure real reader behaviour before making stronger claims.
