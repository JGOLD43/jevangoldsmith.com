# JGOLD App — Build Plan

Status: Android foundation and native website/studio v1.1 implemented  
Purpose: describe how a private phone app could work alongside jevangoldsmith.com

## The idea

The app would be a personal home for two kinds of activity:

- Keeping private information about life: finances, notes, photos, documents, people, travel, ideas, and anything else worth remembering.
- Managing the public website: preparing posts, choosing photos, editing existing content, previewing changes, and publishing them.

It would feel like one coherent personal app, but private material and publishable material would be kept in separate parts of its architecture. Private information would stay on the phone. Public content would leave the phone only when it is deliberately published.

Frontier AI models would also be available in the app. They would be useful for brainstorming, rewriting, organising public material, generating titles, planning projects, and helping operate the website. They would not automatically receive private vault content as context.

## What the app would feel like

The main navigation could have four areas.

### Home

A personal dashboard showing useful local information:

- Recent private notes and photos
- Current goals and projects
- A high-level financial snapshot
- Drafts being prepared for the website
- Recently published website changes
- Quick capture buttons

The dashboard would be assembled on the phone from local data. It would not need to send private information to a server to generate the view.

### Vault

The private side of the app. Likely sections include:

- Notes and journal entries
- Finances, budgets, recurring costs, receipts, and account notes
- Private photos, videos, and documents
- People and relationship notes
- Trips, places, and memories
- Ideas, goals, and project notes

The vault would work offline and be protected by the Galaxy S23 Ultra fingerprint sensor or Android device lock. Its database and files would be encrypted locally.

### Website

A publishing studio shaped around the existing website:

- Add and edit essays, adventures, projects, challenges, people, and other collections
- Select and prepare public images
- Preview how a page will look
- Save public drafts
- Publish updates
- See whether a deployment succeeded
- Correct or roll back a public change

The website section would deal only with material intended for the public site. If something begins as a private note, the app would make a separate public draft rather than publishing the original private record.

### AI

An assistant for work that is safe to send to a frontier model:

- Brainstorm an essay or project
- Rewrite a public draft
- Suggest titles, summaries, tags, or page structure
- Review a proposed public page
- Help plan work without reading private records
- Explain how to use or improve the website

The AI area would start with no access to the vault. It could work with text typed directly into the AI conversation and with public drafts deliberately opened in the AI workspace. The interface would make the material being used as AI context understandable without turning every interaction into a security ceremony.

For private-data features—such as searching journals or categorising personal photos—we could later use smaller models that run directly on the phone. These would be less capable than frontier cloud models, but the information would remain local. A cloud model marketed as private or zero-retention would still receive the data, so it would not meet the same “stays on my phone” preference.

## How the pieces would fit together

```text
                         PERSONAL PHONE APP

  ┌───────────────────────┐       ┌────────────────────────┐
  │ Private vault         │       │ Public workspace       │
  │                       │       │                        │
  │ Finances              │       │ Website drafts         │
  │ Private photos        │       │ Selected public images │
  │ Notes and journals    │       │ Page previews          │
  │ Personal documents    │       │ Publishing history     │
  │                       │       │                        │
  │ Encrypted on phone    │       └───────────┬────────────┘
  └───────────┬───────────┘                   │
              │ create a separate             ├──── frontier AI
              │ public version                │     (public context only)
              └──────────────────────────────►│
                                              ▼
                                      Publishing service
                                              │
                                              ▼
                                      Existing Astro site
```

The app would contain three distinct technical services:

1. A local vault service that can read and write encrypted private data.
2. A public-content service that manages material prepared for the website.
3. A network service that handles AI requests and publishing, using public workspace data rather than reading the vault directly.

Keeping these as separate modules makes accidental mixing less likely and makes the privacy boundary testable.

## Storing private information on the phone

### Database

Structured private information would live in an encrypted SQLite database, most likely using SQLCipher. This is more suitable than browser storage or an ordinary unencrypted app database.

On first launch, the app would create a random encryption key and protect it using the Android hardware-backed Keystore. The S23 Ultra fingerprint sensor would unlock access. The app would lock again after a chosen period or whenever the phone changes user/security state.

### Photos and files

Private images and documents would be copied into the app’s protected storage and encrypted. Thumbnails would also be local. Temporary files created while viewing or editing an image would be cleaned up.

The app could offer two photo actions:

- Take a private photo directly in the app so it is not automatically added to the normal Photos library.
- Import an existing photo into the vault. In this case, the encrypted app copy is private, but the original may already be in Samsung Gallery, Google Photos, OneDrive, or another configured photo service.

### Backups

There is an unavoidable choice between strict local-only storage and easy recovery.

For the first version, I would disable Android application backup and verify that Samsung Smart Switch, Google backup, and device-to-device transfer do not carry the vault. That keeps the interpretation of “on this phone” clear. It also means losing or wiping the phone could mean losing the vault.

Later, the app could provide a manual encrypted export. The user would decide where to place it and protect it with a strong recovery password. That would be an optional escape hatch, not automatic cloud synchronisation.

## Using frontier AI without supplying private data

The app can use leading cloud AI models while keeping their role focused on non-private work.

### Suitable AI uses

- Work on text already intended for the public website
- Generate alternative headlines or summaries
- Turn rough, non-private notes typed into the AI screen into a public draft
- Review site structure, content quality, or writing style
- Help plan projects using a description written for that conversation
- Suggest categories, tags, layouts, or publishing checklists
- Help interpret public website analytics if those are added later

### How I would build the AI boundary

The AI client would be connected to the public workspace, not to the vault database. Opening the AI assistant would not silently retrieve journals, financial records, photos, contacts, or other private content.

When using AI from a public draft, the app would send that draft and any public attachments selected for the task. When starting a general chat, it would send only what is typed into that chat. AI conversation history could be kept locally; whether the model provider retains a request depends on the provider and account configuration, so the app should prefer provider options with minimal or zero retention where available.

AI credentials would not be embedded directly in the phone app. Requests would pass through a small private gateway that:

- Authenticates the app owner
- Holds provider API credentials
- Allows a choice of frontier model/provider
- Avoids storing prompt and response bodies in application logs
- Applies sensible request and spending limits
- Can be changed later without releasing a new app version

The gateway still sees the data sent through it. This is acceptable for public or deliberately non-private prompts, but it is another reason not to connect the vault to the cloud AI feature.

### Local AI possibilities

On-device models could eventually help with private information by:

- Searching private notes semantically
- Suggesting local tags
- Extracting receipt totals
- Finding duplicate photos
- Performing OCR
- Producing simple summaries

These features would be evaluated individually based on what current phones can run well. They would complement frontier models rather than replace them.

## Turning something private into something public

A common workflow might be a trip:

1. Keep the full trip privately, including receipts, exact locations, personal notes, and every photo.
2. Choose **Make a website draft**.
3. Select the photos and parts of the story that belong in the public version.
4. The app creates a new public draft, leaving the original private trip unchanged.
5. Use a frontier model to improve the public draft if wanted.
6. Preview the finished page.
7. Publish it to the website.

The same pattern works for a journal entry becoming an essay or a private project log becoming a public project page.

The separation is valuable beyond privacy: the public version can be edited for clarity without changing the personal record of what happened.

## Publishing to the existing website

The current site is a good base for this approach:

- Astro builds the public pages from `data/*.json`.
- The repository already contains content schemas and validation.
- GitHub records the public change history.
- The existing CMS can remain available as a desktop/browser editor.

The mobile app would not need to rebuild the website architecture. It would send a public-content package to a small publishing service. That service would validate the package, convert it into the existing JSON and image structure, and create a GitHub branch or pull request.

The normal site checks would then run before deployment. The app could show a preview, validation errors, and the final deployment status.

I would begin with preview branches or pull requests rather than direct publishing to `main`. Once the workflow is reliable, a one-tap direct-publish option could be added for simple updates.

## Suggested technical approach

### Mobile app

- React Native with Expo prebuild
- Samsung Galaxy S23 Ultra first, with the code kept reasonably portable to iOS
- SQLCipher-backed local database
- Android Keystore and strong-biometric fingerprint integration
- Encrypted application file storage
- Local-first state and offline operation

### Repository structure

The app could live beside the website in the same repository:

```text
mobile/
  app/                    screens and navigation
  src/vault/              private records and encrypted storage
  src/public-workspace/   website drafts and staged media
  src/ai/                 AI conversations and model gateway client
  src/publishing/         website publishing client
  src/security/           keys, fingerprint unlock, locking, protected files
  src/shared/             shared visual components

packages/
  public-content-schema/  shared app/website publishing format

server/
  app-gateway/            authentication, AI proxy, publishing endpoints
```

The AI and publishing modules would be designed around public-workspace types. The vault would have its own models and repository interface.

### Server component

A small server component is needed for two external activities:

- Calling frontier AI providers without placing provider keys in the app
- Publishing approved content to GitHub without placing a GitHub credential in the app

It would not hold the private vault database or act as a personal-data sync service.

## Build phases

### Phase 1 — Foundation prototype

Build a small Galaxy S23 Ultra prototype that demonstrates:

- Fingerprint lock and automatic relocking
- Encrypted database storage
- An encrypted photo captured inside the app
- Offline access
- Vault exclusion from normal cloud backups
- Clean behaviour when the app backgrounds

This phase proves the sensitive foundation before investing in the full interface.

### Phase 2 — Useful private vault

Add the first everyday features:

- Notes and journal
- Basic finance records and receipts
- Private photo and document storage
- Tags, search, favourites, archive, and deletion
- A personal home dashboard

Search would initially be conventional on-device search. Local AI enhancements could come later.

### Phase 3 — Public website workspace

Build a separate public content area:

- Essay and adventure drafts first
- Public image selection and processing
- Page previews
- Conversion from a private item into an independent public draft
- A local publishing history

The first version would prepare content without sending it anywhere, allowing the private-to-public workflow to be refined safely.

### Phase 4 — Frontier AI

Add the AI gateway and assistant:

- Support one strong frontier model initially
- General AI chat using only text entered in the chat
- AI actions on public drafts
- Model switching architecture for adding other providers later
- Local conversation history
- Basic cost visibility and usage limits
- Checks that the AI module has no direct vault dependency

This produces useful AI capability without making the vault part of the model context.

### Phase 5 — Website publishing

- Define a shared public-content schema
- Add authenticated publishing endpoints
- Integrate with GitHub through a narrowly scoped GitHub App
- Generate preview branches or pull requests
- Run existing website validation and build checks
- Show previews and deployment status in the phone app

Support a few website collections first, then expand once round-trip editing is proven.

### Phase 6 — Hardening and private release

- Test on a physical phone under low storage, offline, interrupted-write, reinstall, and migration scenarios
- Inspect app storage and backups for unintended plaintext
- Inspect network traffic while using vault features
- Check that logs do not contain personal content
- Verify that public image processing removes unwanted location metadata
- Conduct a focused security review
- Distribute privately through TestFlight or a signed personal build

### Phase 7 — Expansion

Possible later work:

- Richer finance dashboards and charts
- Local OCR and receipt processing
- On-device semantic search
- Maps and trip history
- More website content types
- Scheduled publication of already approved public drafts
- Optional encrypted export and restore
- iOS support

## Recommended first release

The first genuinely useful version would include:

- A Galaxy S23 Ultra app protected by fingerprint authentication
- Encrypted notes, finance entries, private photos, and attachments
- No automatic cloud sync
- Public drafts for essays and adventures
- A deliberate private-to-public copy workflow
- Frontier AI chat for general, non-private work
- Frontier AI editing for public drafts
- Website previews and publishing through GitHub pull requests

This is enough to prove the whole concept without attempting to model every part of life at once.

## Decisions to make before implementation

The main choices are product choices rather than blockers:

1. Which Android versions beyond the Galaxy S23 Ultra should be officially supported.
2. Which private module matters most after notes: finances, photos, journal, or trips.
3. Whether losing the phone should mean losing the vault initially, or whether encrypted manual export belongs in the first release.
4. Which website content types should be publishable first.
5. Which frontier AI provider/model should be connected first, while keeping the gateway provider-independent.

My suggested starting point is Galaxy S23 Ultra first, notes plus finances and photos, essays plus adventures for publishing, one frontier model behind a provider-independent gateway, and encrypted export added after the core local storage has been tested thoroughly.
