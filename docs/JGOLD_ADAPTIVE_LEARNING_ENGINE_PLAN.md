# JGOLD Adaptive Learning Engine — Repository-Grounded Build Plan

Status: implementation plan  
Target: JGOLD on Samsung Galaxy S23 Ultra  
Source specification: “Adaptive Skill Tree Learning Engine”, version 0.1  
First domain: spoken French  

## 1. Outcome

Add a private, local-first Learning workspace to JGOLD, with a tightly scoped ChatGPT voice coach, that answers four questions:

1. What can Jevan demonstrably do?
2. What is he learning now?
3. Which prerequisite is blocking progress?
4. What is the most useful thing to practise next?

The engine will model measurable skills connected by prerequisite edges. Training attempts create evidence; evidence changes learner-specific skill states; stable skills unlock dependent skills; forgotten skills return for retrieval; weak prerequisites trigger repair work.

French will prove the engine, but generic logic will remain separate from French content so mathematics, physics, programming, writing, and business judgment can reuse it later.

JGOLD—not ChatGPT—will remain the source of truth. Before every voice session JGOLD will select the phrases, skills, exercise mix, and duration. During the session it will record structured evidence locally after each attempt. When the session ends, JGOLD will update mastery, reviews, unlocks, streaks, and the next recommended session automatically.

## 2. What already exists in JGOLD

The current app provides a strong base:

- Expo 57, React Native 0.86, React 19, and Expo Router.
- A persistent five-tab shell: Home, Library, Studio, Site, and Settings.
- SQLCipher-encrypted SQLite with its key in Android SecureStore/Keystore.
- Android backup disabled and biometric locking already implemented.
- A local Home model with Goals, Fucket List, Learning, Interests, and Trips.
- Local reading sessions, evidence-like annotations, streaks, statistics, and a GitHub-style activity heatmap.
- Website-aligned light/dark themes and shared native UI primitives.
- A cloud-AI boundary that accepts only typed chat content or an explicitly selected public draft.
- OTA updates for compatible JavaScript and asset changes.

Important gaps the implementation must account for:

- There is no real Projects engine to reuse. “Project” currently means a website content type; the private Home model contains simple `life_items`.
- “Learning” is currently only a `life_items.area` value, not a learning system.
- There is no installed microphone, audio, speech-to-text, text-to-speech, or voice-conversation stack.
- The database uses one large bootstrap function plus an ad-hoc migration. A learning system needs formal ordered migrations before its schema expands further.
- The former AI tab now contains the live Site, so Learning should not assume a visible general AI chat tab exists.

## 3. Product integration

### Keep the bottom navigation stable

Do not add or rename a bottom tab in the first release. Repeated work has already stabilised the current five-tab shell, so Learning will be a first-class routed workspace launched from Home.

Home changes:

- Add a prominent **Continue Training** card near the top when a domain is active.
- Show today’s due reviews, active skill, current streak, and a recent measurable gain.
- Make the existing **Learning** life-area card open the Learning workspace.
- Let an existing Learning goal link to a domain without replacing or duplicating that goal.
- Keep the rest of Home, Library, Studio, Site, and Settings intact.

Routes:

```text
/learning
/learning/[domainId]
/learning/[domainId]/skill/[skillId]
/learning/[domainId]/session
/learning/[domainId]/progress
/learning/[domainId]/diagnostic
```

### Learning dashboard

Show:

- active domains;
- one primary Continue Training action;
- skills due for retrieval;
- current target and weak prerequisites;
- recent gains and milestones;
- practice time and streak;
- demonstrated, fluent, automatic, and retained skill counts.

Avoid “course completion” language. The interface should report abilities gained.

### French domain page

Show:

- current conversational ability;
- the active branch of the skill tree;
- available, learning, fragile, usable, fluent, automatic, and review nodes;
- recent evidence;
- listening, production, fluency, and retention summaries;
- unlocked real-world milestones;
- Start/Continue Training and Progress actions.

The first visualisation should be a performant native branch/lane view, not a heavy free-form graph canvas. Branches can be virtualised and expanded individually. This is more reliable on the S23 Ultra and easier to make accessible. A full pan-and-zoom graph can follow after the data model and interactions are proven.

### Skill detail

Each skill page will explain:

- the measurable ability;
- prerequisites and required thresholds;
- mastery criteria;
- current scores and status;
- recent attempts and errors;
- last delayed retrieval and next review;
- dependent skills that this node can unlock;
- a direct Practice action.

### Training session

A session should prioritise doing over reading:

```text
prompt → response → local evaluation → concise feedback → retry/next rep
```

Support recommended 10-, 20-, and 30-minute plans plus a custom duration. Sessions can mix retrieval, target-skill work, prerequisite repair, interleaving, listening, and transfer challenges while sharing one evidence model.

## 4. Privacy and AI boundary

### Private by default

The following remain encrypted on the phone and are never included in website publishing. They are also excluded from ordinary frontier-AI requests; the deliberately started voice session receives only the narrow exception described below:

- domains and personal learning goals;
- learner skill states and confidence;
- historical attempt prompts and responses;
- stored recordings and historical transcripts;
- error history and coach feedback;
- review schedule;
- full session history and aggregate progress metrics.

No learning data will automatically appear on the public website. If public learning milestones are wanted later, JGOLD will create a separate, previewable, allowlisted public copy—matching the existing private-to-public draft pattern.

### Frontier models

The existing AI service must continue to have no import path to the learning repository.

Frontier AI may be used only for:

- text deliberately typed into a general AI request;
- public website drafts;
- curriculum or exercise content generated during development from non-personal, static skill definitions;
- the deliberately started French voice session described below.

The voice coach necessarily receives the live voice conversation, the selected target phrases, the session duration, and the ordered exercises required to coach that session. It does not receive the underlying mastery history or the reason JGOLD selected each exercise. It must not receive unrelated JGOLD information such as the vault, finances, photos, essays, books, website drafts, trips, contacts, or general Home data.

The voice-session start screen will state this boundary once in plain language: **This session sends your voice and this practice plan to OpenAI. Nothing else in JGOLD is included.** Starting the session is the deliberate consent action; normal app use sends nothing.

### Local learning engine

Adaptive selection, mastery updates, review scheduling, prerequisite repair, and the permanent learning record will be deterministic local code. The initial French exercises will be bundled and hand-reviewed. ChatGPT coaches the selected session; it does not decide the curriculum or directly set mastery.

For open-ended practice, use a staged local approach:

1. Template-driven guided conversations constrained to known skills.
2. On-device speech recognition when Android confirms an on-device recogniser is available.
3. Local scoring based on transcription match, latency, known variants, required structures, self-correction, and prior evidence.
4. A later fully on-device language/pronunciation model only after an S23 Ultra performance and privacy spike.

Pronunciation must not be presented as accurately scored when the available evidence only supports transcription confidence or a model judgment. Early versions should label it as “recognised”, “needs another attempt”, or “coach-observed” rather than inventing a phoneme score.

### Recommended ChatGPT voice architecture

Build the voice experience inside JGOLD with OpenAI Realtime, rather than opening the separate consumer ChatGPT app.

Reasons:

- JGOLD can pass exact session instructions before the first spoken turn.
- The session can enforce a timer and visible target list.
- Realtime function tools can ask JGOLD to record structured attempt evidence.
- JGOLD can finalise interrupted sessions even if the model fails to produce a summary.
- The app can keep API credentials out of the APK by obtaining an ephemeral session secret from the private gateway.
- The existing consumer ChatGPT app does not provide JGOLD with a dependable automatic local-database write-back contract.

Flow:

```text
JGOLD local engine selects session
  → user reviews phrases + duration and taps Start
  → private gateway issues a short-lived Realtime client secret
  → JGOLD starts the voice session with a minimal SessionBrief
  → ChatGPT coaches and emits structured function calls
  → JGOLD validates and writes each event to encrypted SQLite
  → local engine chooses the next exercise
  → timer/session end triggers local finalisation
  → mastery, reviews, unlocks, metrics, and next session update
```

API keys stay in the gateway. The gateway should issue only short-lived session credentials, authenticate the single owner, rate-limit requests, disable prompt-body logging, and avoid storing transcripts or session summaries.

### Session brief supplied at the start

```ts
type VoiceSessionBrief = {
  version: 1;
  sessionId: string;
  domain: 'french';
  mode: 'guided' | 'stretch' | 'conversation';
  plannedDurationSeconds: number;
  endsAt: string;
  targetSkills: Array<{
    skillId: string;
    ability: string;
    phrases: string[];
    acceptedVariants: string[];
    masteryTest: string;
  }>;
  blocks: Array<{
    activity: 'retrieval' | 'target' | 'repair' | 'interleave' |
              'conversation' | 'recap';
    durationSeconds: number;
    skillIds: string[];
  }>;
  knownLanguageForThisSession: string[];
  noveltyBudget: {
    maximumNewChunks: number;
    maximumUnknownLanguageRatio: number;
  };
  coachRulesVersion: string;
};
```

The brief contains no name, finance data, vault content, book content, essay content, website content, unrelated goals, scores, prior errors, or historical transcripts. Avoid sending the full skill graph or full history. Send only what is needed for this session.

### Realtime tools owned by JGOLD

The model may request these functions, but JGOLD validates every argument and performs every write locally:

```ts
record_attempt({
  sessionId,
  exerciseId,
  skillIds,
  result: 'correct' | 'partial' | 'incorrect' | 'skipped',
  unaided,
  hintLevel,
  responseLatencyMs,
  errorCodes,
  coachConfidence
})

record_learning_event({
  sessionId,
  type: 'repeat' | 'slower' | 'hint' | 'english_rescue' |
        'self_correction' | 'listening_breakdown' | 'interruption',
  skillIds
})

get_next_exercise({ sessionId })

finish_learning_session({
  sessionId,
  completionReason: 'timer' | 'user' | 'coach' | 'connection_lost'
})
```

`get_next_exercise` calls the local selector and returns the next prompt; the model does not freestyle the progression. Tool outputs return only acknowledgement and the next exercise, not private database rows.

The app independently timestamps turns, timer events, and connection state. Model tool calls are evidence, not unquestioned truth. The model cannot directly write `learner_skill_states`, change a review date, or unlock a skill.

### Guaranteed update after every use

Session recording begins before the Realtime connection. Each attempt is committed locally as it occurs. On normal completion, user exit, backgrounding, crash recovery, or connection loss, JGOLD finalises the session from locally recorded evidence.

Every session updates:

- planned and actual duration;
- phrases and skills practised;
- exercise and attempt counts;
- correct, partial, incorrect, skipped, and unaided results;
- latency, hints, repetitions, self-corrections, and English rescues;
- recurring error codes;
- learner-skill scores and statuses;
- next review dates;
- newly available skills;
- session/practice streaks and activity heatmap;
- the next recommended session.

The session must remain useful if the network drops: finish the current locally available exercise, save everything, and offer either a local text fallback or a clean Resume Voice action.

## 5. Audio and voice architecture

Voice requires a new native build, not only an OTA update.

Recommended implementation:

- Add Expo 57’s `expo-audio` for foreground recording/playback.
- Request only `RECORD_AUDIO`; do not enable background recording or its foreground service.
- Stream voice directly to the Realtime session when online; do not create a persistent recording by default.
- If temporary audio buffers/files are required by the React Native transport, keep them in cache and delete them as soon as the turn is acknowledged.
- Never log audio, file paths, transcripts, session briefs, or utterance text.
- Keep a small on-device speech/TextToSpeech fallback as a later resilience layer, not the primary open-ended coach.
- Handle permission denial, calls/alarms, Bluetooth disconnects, recogniser unavailability, low storage, and interrupted recordings without losing the session.

The first vertical slice should still work in text mode so the engine is testable before the native voice layer is ready.

The Realtime session should use low-latency speech-to-speech for natural turn-taking and barge-in, with JGOLD function tools controlling progression and persistence. Set tracing off for private learning sessions and keep gateway/application logs metadata-only.

## 6. Data architecture

### Introduce ordered migrations first

Create `src/storage/migrations/` and a `schema_migrations` table. Each migration runs once inside a transaction and records its version. Existing tables remain untouched except for a nullable link from a Home Learning item to a domain.

### Tables

```text
learning_domains
learning_skills
learning_skill_prerequisites
learning_exercise_templates
learner_skill_states
learning_attempts
learning_attempt_error_codes
learning_review_queue
learning_sessions
learning_session_events
learning_milestones
```

Key decisions:

- Do not add a fake `user_id`; this is a single-owner, local app.
- Store graph edges in `learning_skill_prerequisites`, never only in JSON.
- Give each prerequisite edge a required status/threshold because some compound skills require fluent—not merely usable—foundations.
- Add foreign keys and indexes for domain, status, due-review time, session, skill, and attempt time.
- Preserve evidence even when a skill state changes so progress remains auditable.
- Do not store a persistent audio URI on an attempt by default.
- Add a `seed_version` to domain content so French seed updates are idempotent and do not overwrite learner evidence.
- Link a `life_items` Learning goal to a domain through a nullable `learning_domain_id` or a small junction table.

### Core domain types

Add generic types for:

- `LearningDomain`
- `Skill`
- `SkillPrerequisite`
- `MasteryCriterion`
- `ExerciseTemplate`
- `LearnerSkillState`
- `AttemptEvidence`
- `ReviewEntry`
- `TrainingSession`
- `SessionEvent`
- `Milestone`

Keep French-only error codes, prompt variants, accepted answers, and listening assets under `src/learning/domains/french/` rather than in the generic engine.

## 7. Explicit engine rules

Implement the first algorithms as pure, inspectable functions with unit tests.

### Unlocking

A skill becomes available only when every prerequisite meets the threshold stored on its edge. Reject cycles and missing nodes at seed/import time.

### Mastery states

Use:

```text
locked → available → learning → fragile → usable → fluent → automatic
                                      ↘ review ↗
```

Track separate 0–1 scores for recall, accuracy, fluency, latency, transfer, retention, and confidence. Never store only `mastered: true`.

Initial thresholds should be conservative and readable. For example:

- **Usable:** at least 80% recent accuracy, unaided recall, acceptable structured result, and no repeated recent failure.
- **Fluent:** at least 90% recent accuracy, target latency, success in more than one context, and one delayed retrieval.
- **Automatic:** at least 95% recent accuracy, low latency, success within a compound task, and multiple spaced retrievals.

Thresholds will live in versioned configuration and tests, not in opaque model prompts.

### Review scheduling

Start with an inspectable ladder such as 1, 3, 7, 14, 30, and 60 days, adjusted down after a failure and up after strong delayed retrieval. Use local calendar calculations that are tested around time zones and daylight-saving boundaries.

### Next-exercise selection

Choose from:

- 25% due retrieval;
- 35% active target;
- 15% weak prerequisite repair;
- 15% interleaved learned material;
- 10% compound/transfer work.

Critical prerequisite failure overrides the weighting. The selector should accept a seeded random source in tests so its behaviour is reproducible.

To optimise learning speed, rank candidate skills by expected durable ability gained per minute:

```text
priority =
  due urgency
  × prerequisite/unlock leverage
  × real-world frequency
  × learner uncertainty
  × weakness/fragility
  ÷ estimated practice time
```

This keeps the system focused on high-value bottlenecks rather than easy reps or content completion.

### Fast-session rules based on the specification’s learning principles

- Test recall before showing an answer.
- Give the minimum explanation needed, then immediately request a rep.
- Correct the highest-value error first, not every small imperfection at once.
- Retry immediately after a correction, then retrieve again later in the session.
- Reduce isolated reps when the response is accurate and fast.
- Decompose or test prerequisites after repeated failure instead of repeating the same prompt.
- Interleave stable material so success transfers beyond one memorised order.
- Use a small novelty budget: ordinarily no more than 3–5 new chunks in a 20-minute session, and fewer when error rate rises.
- End a block early when the skill is clean across varied contexts; spend saved time on a bottleneck.
- Do not promote a skill to retained without a later-session retrieval.
- Finish with one compound conversational challenge and a very short recap.

Default session options:

```text
10 min: 2 retrieval + 5 target/repair + 2 guided use + 1 recap
20 min: 3 retrieval + 9 target/repair + 6 guided conversation + 2 recap
30 min: 5 retrieval + 12 target/repair + 10 conversation + 3 recap
```

JGOLD stores the chosen duration and includes an absolute `endsAt` time in the session brief. The app timer—not the model—ends the session reliably.

### Prerequisite repair

When a higher skill repeatedly fails:

1. inspect its prerequisite states and recent errors;
2. run a short diagnostic rep on the most likely weak prerequisite;
3. downgrade only when evidence warrants it;
4. schedule repair reps;
5. retry the higher skill after repair.

## 8. French seed

Create a versioned, idempotent French seed covering the specification’s progression:

1. Speech mechanics.
2. Conversation survival and communication repair.
3. Core sentence generation.
4. Everyday conversation.
5. Time and narrative.
6. Conversational flexibility.
7. Natural listening and speech.
8. Independent conversation.
9. Goal-specific advanced proficiency.

Do not treat every phrase as a content card. Each seeded node needs:

- an observable ability statement;
- prerequisites;
- one or more mastery criteria;
- suitable exercise templates;
- accepted variants where relevant;
- tags for branch, modality, difficulty, frequency, and importance.

Seed the observed current French abilities as **probable evidence to verify**, not permanent mastery. The first diagnostic should verify greetings, identity, weather, repair language, politeness, core verbs, question words, slow listening, normal listening, generation, and a short guided conversation. Repeated failure should stop probing that branch.

## 9. Code organisation

```text
private-companion-app/src/
  app/learning/
    index.tsx
    [domainId]/index.tsx
    [domainId]/diagnostic.tsx
    [domainId]/session.tsx
    [domainId]/progress.tsx
    [domainId]/skill/[skillId].tsx
  components/learning/
    learning-dashboard.tsx
    domain-card.tsx
    skill-tree.tsx
    skill-node.tsx
    mastery-meter.tsx
    evidence-timeline.tsx
    training-coach.tsx
    voice-attempt.tsx
  learning/engine/
    unlocking.ts
    mastery.ts
    reviews.ts
    selector.ts
    prerequisite-repair.ts
    diagnostics.ts
  learning/domains/french/
    seed.ts
    skills.ts
    exercises.ts
    evaluator.ts
    error-codes.ts
  storage/
    migrations/
    learning-repository.ts
    learning-analytics.ts
  state/
    learning-context.tsx
  modules/realtime-audio/
  tests/
    learning-graph.test.mjs
    learning-mastery.test.mjs
    learning-reviews.test.mjs
    learning-selector.test.mjs
    learning-privacy.test.mjs
```

Keep Learning state in its own provider inside the existing authenticated shell. Do not add its large, frequently changing session state to `AppContext`; minimise subscriptions so a timer or waveform does not rerender Home, Library, or Site.

Use virtualised lists for large skill/evidence collections, memoised node rows, `expo-image` for any imagery, and animations limited to transforms/opacity. Hide the persistent bottom tabs only during a focused training session if testing shows they distract; all other Learning pages use the same stable shell.

## 10. Implementation sequence

### Phase 0 — foundation and safety

- Add ordered database migrations.
- Add learning types, repository boundaries, and privacy architecture tests.
- Add migration rollback/recovery tests using a copied test database.
- Confirm no learning module is imported by AI or publishing services.

Exit criterion: an existing installed database migrates without losing current vault, essays, books, movies, or Home data.

### Phase 1 — generic engine and French seed

- Create tables and repositories.
- Implement graph validation, cycle detection, unlocking, explicit mastery transitions, review scheduling, selector, and repair logic.
- Add idempotent French seed version 1.
- Add deterministic unit tests for every transition and graph edge case.

Exit criterion: the engine can run a complete synthetic learning journey without UI or network access.

### Phase 2 — read-only Learning experience

- Build `/learning`, French domain, branch-based skill tree, skill detail, and progress pages.
- Integrate Home’s Learning area and Continue Training card.
- Reuse JGOLD colours, Chivo typography, safe areas, bottom navigation, and light/dark mode.
- Use existing activity heatmap patterns for practice activity.

Exit criterion: the seeded tree and evidence can be explored smoothly on the S23 Ultra with no navigation regressions.

### Phase 3 — text training vertical slice

- Add diagnostic flow.
- Add local exercise rendering and text/free-response attempts.
- Persist evidence and session events transactionally.
- Update mastery, unlocking, review queues, and Home metrics after each attempt.
- Implement 10/30/60-minute session plans.

Exit criterion: French skills can move from available through review using real local attempts, with no cloud dependency.

### Phase 4 — ChatGPT Realtime voice

- Add foreground microphone permission, `expo-audio`, and the Realtime transport.
- Build and install a new APK/runtime because native dependencies and permissions change.
- Add the authenticated gateway endpoint that issues short-lived Realtime client secrets; never put the OpenAI key in the app.
- Create the versioned session brief and strict Realtime tool schemas.
- Validate tool calls and persist each attempt/event locally.
- Set tracing off and keep gateway logs metadata-only.
- Delete transient audio buffers/files immediately.
- Add interruption, connection-loss, timer, and crash finalisation.
- Test with phone speaker, wired/USB audio if available, Bluetooth, poor network, offline mode, and denied permission.

Exit criterion: every spoken session begins with the exact local plan, updates encrypted local evidence after each attempt, and finalises correctly even when the connection is interrupted. Packet capture confirms that only Realtime voice/session traffic is sent and no unrelated JGOLD data leaves the phone.

### Phase 5 — guided conversation and optimisation

- Build Guided and Stretch modes from known templates and current skill states.
- Log “again”, “slower”, “hint”, “English”, and comprehension breakdowns as learning events.
- Attribute conversation errors to component skills and schedule repair.
- Add duration-aware block switching and early graduation from stable skills.
- Add Immersion only after Guided and Stretch session evidence is reliable.

Exit criterion: a five-minute guided French conversation updates relevant evidence and weak prerequisites.

### Phase 6 — progress and polish

- Add demonstrable-skill, retention, latency, listening-speed, sustained-conversation, and rescue metrics.
- Add meaningful milestones and recent-gain explanations.
- Performance-profile the tree, evidence timeline, session timer, audio pipeline, and database queries on the S23 Ultra.
- Complete accessibility, empty/error/offline states, and dark/light theme QA.

Exit criterion: progress explains what improved and why, not merely a percentage or level.

### Phase 7 — generalise carefully

- Add a domain-authoring validator and internal graph inspector.
- Prove one non-language domain—preferably Business Judgment—with scenario-based evaluators.
- Only then expose creation of additional domains in the app.

Exit criterion: a second domain reuses repositories, graph logic, review scheduling, sessions, and progress without French conditionals in the generic engine.

## 11. Testing and verification

### Unit tests

- graph cycles, orphans, missing assessments, and invalid edges;
- unlock thresholds and downgrade behaviour;
- every mastery transition and non-transition;
- review dates, failed retrieval, and rapid restoration;
- selector weighting, priority overrides, and reproducibility;
- prerequisite attribution and repair;
- seed idempotency and version upgrades;
- local date/streak calculations;
- AI and publishing dependency boundaries.

### Integration tests

- session start → attempt → evidence → state → unlock → review;
- interrupted attempt and app-background recovery;
- migration from the currently installed schema;
- biometric lock during/after a session;
- light/dark theme propagation from Site;
- no regression to Home, Library, Studio, Site, Settings, reading, or publishing.

### Physical S23 Ultra tests

- airplane-mode training;
- packet capture during text and voice sessions;
- microphone permission denied/revoked;
- low storage and cache cleanup;
- app killed during recording or database transaction;
- screen capture and Recents-preview protection;
- thermal/battery behaviour in 30- and 60-minute voice sessions;
- smooth scrolling with the complete French tree and a long evidence history.

## 12. Release and update plan

- Phases 0–3 can generally ship as an Expo OTA update if they add no native dependency and remain compatible with runtime 1.5.0.
- Phase 4 requires a newly signed native Android build because it adds microphone permission, `expo-audio`, and the Realtime audio transport.
- After that runtime is installed once, most curriculum, rules, UI, and analytics changes can again ship through OTA updates.
- Publish to preview first, run migration and physical-device smoke tests, then promote the exact update to production.
- Never make an irreversible database migration in the same release that first introduces a new training UI; migrate safely, verify, then enable the feature.

## 13. MVP definition of done

French v1 is done when Jevan can:

- open Home and see what to practise next;
- enter Learning → French and inspect a real prerequisite tree;
- complete a short diagnostic without being reset to beginner;
- practise by text locally and by ChatGPT Realtime voice inside JGOLD;
- receive concise, honest local feedback;
- create auditable attempt evidence;
- move skills through explicit mastery states;
- unlock dependent skills;
- have forgotten skills return for retrieval;
- trigger prerequisite repair after repeated failure;
- complete a guided conversation that updates evidence;
- see progress as durable abilities, retention, speed, and conversation capacity;
- retain and review all local progress offline, with text practice available when voice is disconnected;
- verify that voice sessions send only the displayed practice plan and live conversation—not the vault or unrelated JGOLD data—and that nothing is sent to GitHub publishing or the public website.

## 14. First build slice

The safest and most useful first implementation slice is:

1. ordered migrations;
2. generic graph/evidence/mastery repositories;
3. an idempotent 20–30-skill French survival/core-sentence seed;
4. graph validation and engine tests;
5. Learning dashboard, French branch view, and skill detail;
6. a text-only diagnostic and training loop;
7. Home Continue Training integration.

This slice proves the product before introducing native audio risk. Once it works on the installed app, the next signed Android build adds the local voice layer.
