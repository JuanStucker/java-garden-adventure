# Java Garden Adventure — v0.1 launch plan

## Outcome

Ship a small but complete learning loop as a public static website:

- Repository: `JuanStucker/java-garden-adventure`
- Intended URL: `https://juanstucker.github.io/java-garden-adventure/`
- Hosting: GitHub Pages from `main` and the repository root
- Technology: semantic HTML, CSS, and browser-native JavaScript
- Data: static JSON quest definitions plus versioned `localStorage` progress
- Build step, backend, accounts, analytics, and paid services: none

Both likely repository names were checked on 2026-07-25; `java-garden-adventure`
appears available. The machine is already authenticated to GitHub as
`JuanStucker`.

The target is a usable v0.1 in one focused working day (roughly 6–8 hours).
The Pages URL should exist after the first 20–30 minutes and update after every
push. It should only be shared with the learner after the core-loop smoke test
passes.

## The v0.1 product

The first release validates one question: can the learner open the page, choose
one manageable activity, complete or flag it as stuck, and return later with
their progress intact?

Include:

1. A welcome screen with a display name and one fixed mascot, Momo.
2. A calm, responsive home screen with current XP and progress.
3. Low, medium, high, and surprise-me energy choices.
4. Optional 10, 20, 30, or 45+ minute preference.
5. At most three recommendations, including a low-pressure option where
   possible.
6. Quest details with objective, instructions, evidence checks, and progressive
   hints.
7. Start, pause, resume, stuck, and complete states.
8. A stuck form for attempts, errors, and a tutor question.
9. Completion inputs for actual minutes and confidence before/after.
10. XP, simple unlocks, and a three-stage garden plant.
11. A compact Tutor Corner listing stuck quests and prepared questions.
12. Automatic, versioned `localStorage` saving.
13. A guarded reset action and a plain-language local-storage notice.
14. Keyboard access, visible focus, reduced-motion support, readable contrast,
    and mobile layouts.

This is the specification's Phase 1 core prototype, not its full-course MVP.

## Intentionally defer

Defer these until the core loop has been used at least once:

- the optional live timer;
- backup import/export;
- all 16 complete worlds and 20–30 quests;
- multiple mascots and themes;
- detailed dashboards, filters, search, and print view;
- rich garden customisation, sounds, and raster illustration work;
- offline service worker;
- accounts, synchronisation, database, analytics, and AI.

Deferring these keeps v0.1 small without compromising the main learning loop.
Backup import/export should be the first v0.2 addition because browser storage is
device-specific.

## Initial quest content

Hand-curate 9 quests from the first three weekly syllabus rows rather than
automatically turning long syllabus cells into tasks:

| World | Official source topic | Representative quests |
| --- | --- | --- |
| Hello Garden | Hello World; floating-point values and conditionals | environment check, run Hello World, change values/conditions |
| Loop Lagoon | Booleans, loops, and methods | predict a loop, modify one, write a small method, explain it |
| Memory Meadow | Stack, recursion, characters, and arrays | trace a call/array, solve a small array task |

Across those quests, include every core quest shape at least once: discover,
guided example, make-it-yours, solo, teach-the-mascot, and boss. Give the set a
mix of 10-, 20-, 30-, and 45-minute activities and low, medium, and high energy
labels.

Use the CSV at
`/home/justu/Downloads/hhu_programmierung_ws25_26_syllabus.csv` as source
material. Preserve the official topic names and source URLs, but rewrite each
quest as a small, testable action in learner-friendly language. Do not surface
the historical WS 2025/26 deadlines in v0.1: the product is deliberately
schedule-free, and those dates have passed.

Stable IDs should describe meaning rather than position, for example:

```text
hello-guided-run-program-v1
loops-solo-countdown-v1
arrays-teach-index-zero-v1
```

## Minimal repository structure

```text
java-garden-adventure/
├── .github/workflows/validate.yml
├── assets/
│   └── garden.svg
├── css/
│   └── styles.css
├── data/
│   ├── quests.json
│   └── worlds.json
├── js/
│   ├── app.js
│   ├── recommendations.js
│   └── storage.js
├── tests/
│   └── test-plan.md
├── index.html
├── README.md
└── MVP_PLAN.md
```

Keep one HTML entry point and use in-page views, so GitHub Pages never has to
resolve application routes. All asset and data paths must be relative so the
site works under `/java-garden-adventure/`. Quest definitions remain separate
from saved progress, linked only by stable quest IDs.

## Implementation order

### 0. Publish the empty shell — 20–30 minutes

1. Initialise Git on `main`.
2. Add the semantic page shell, base styles, README, and this plan.
3. Create the public `JuanStucker/java-garden-adventure` repository and push.
4. Enable Pages from `main` and `/`.
5. Confirm the URL in a logged-out window.

Exit condition: the public URL loads a branded placeholder with no console
errors.

### 1. Build the vertical learning loop — 2–2.5 hours

1. Implement onboarding and the state schema.
2. Load and validate worlds and quests.
3. Implement energy/time ranking and return at most three eligible quests.
4. Add quest start, pause, stuck, resume, and complete transitions.
5. Persist after every meaningful change.

Exit condition: one quest can travel through the entire loop and retain its
state after a reload.

### 2. Add the launch content and feedback — 1.5–2 hours

1. Write and review the 9 initial quests.
2. Add progressive hints, evidence checks, confidence, actual minutes, and XP.
3. Add unlock prerequisites and the simple garden-growth reward.
4. Add Tutor Corner using the same saved state.

Exit condition: all three energy levels produce sensible recommendations and
each content path has a reachable next quest.

### 3. Harden the experience — 1–1.5 hours

1. Handle missing JSON, unavailable storage, corrupt saved state, and stale quest
   IDs with friendly fallbacks.
2. Add duplicate-ID, missing-world, missing-prerequisite, circular-dependency,
   energy, duration, and XP validation.
3. Add guarded reset.
4. Check keyboard flow, focus, contrast, labels, touch targets, and reduced
   motion.

Exit condition: bad content or storage cannot make the entire app unusable.

### 4. Release — 1–1.5 hours

1. Run the functional checks below in local Chrome and Firefox.
2. Test at 360 px, 768 px, and 1366 px widths.
3. Push the release candidate and wait for Pages to publish.
4. Test the production URL logged out and on one real phone.
5. Tag the known-good commit as `v0.1.0`.
6. Give the learner the Pages link plus one sentence explaining that progress is
   saved only in that browser.

Exit condition: the production smoke test passes and the learner needs no GitHub
account or setup instructions.

## v0.1 acceptance test

The release is ready when a learner can, without assistance:

1. Open the public link and enter a display name.
2. Pick an energy level and see no more than three suitable quests.
3. Start a quest, reveal one hint, and pause it.
4. Mark it stuck and save a tutor question.
5. Find the question in Tutor Corner.
6. Resume and complete the quest with evidence, time, and confidence.
7. See XP, an unlock, and visible garden growth.
8. Refresh, close, and reopen the browser with progress intact.

Also verify:

- locked quests are never recommended;
- only valid state transitions are possible;
- a corrupt local save falls back safely;
- all controls work by keyboard;
- the layout has no horizontal scrolling at 360 px;
- Chrome and Firefox pass locally, then mobile Safari or mobile Chrome passes
  against the deployed URL.

## GitHub and release safeguards

- The repository can be public because no learner progress is committed.
- Do not add real learner names, reflections, error messages, or backup files to
  Git.
- Add a workflow that validates JSON and basic content invariants on every push;
  Pages can still publish directly from `main` without a build pipeline.
- Do not choose an open-source license implicitly. Keep the repository
  unlicensed until the owner selects one.
- Keep `main` continuously deployable. If a release breaks, revert the small
  offending commit and let Pages republish the last working state.

## First follow-up after learner feedback

Observe one complete session before expanding the course. Fix any point where
the learner hesitates or needs an explanation. Then ship v0.2 in this order:

1. JSON backup export/import and backup reminders.
2. Optional timer.
3. Remaining worlds in small content batches.
4. Richer progress and tutor summaries.
5. Additional mascot/theme choices and visual polish.

The full 16-world, 20–30-quest MVP is ready only after the core loop is pleasant
and understandable in real use.
