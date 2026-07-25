# Java Garden Adventure — Agent Memory

This file is the durable handoff for coding agents working in this repository.
Read it before changing the product, and update it when a release materially
changes the product, architecture, data model, deployment, or priorities.

## Product mission

Java Garden Adventure is a gentle, schedule-free companion for an introductory
Java course. It helps one learner see the whole course, choose a manageable
activity, and record what is understood or still unclear without streaks,
deadlines, punishments, or pressure to catch up.

The public experience must remain:

- calm, encouraging, playful, and usable without technical setup;
- privacy-preserving, with learner data stored only in that browser;
- accessible by keyboard and responsive down to phone widths;
- explicit that it complements rather than replaces the official HHU course.

## Current production snapshot

Last updated: 2026-07-25  
Current release: `v0.2.1`  
Repository: <https://github.com/JuanStucker/java-garden-adventure>  
Live site: <https://juanstucker.github.io/java-garden-adventure/>

The shipped application currently includes:

- all 15 official syllabus topics and 30 named subtopics in one global view;
- understood, unclear, and unchecked states, derived or set manually;
- a 15-bed garden that mirrors whole-course understanding;
- nine hand-curated learning tasks across the first three course areas;
- five interactive multiple-choice checks with immediate feedback;
- energy- and duration-based recommendations, capped at three;
- task prerequisites, hints, evidence checks, confidence, XP, and unlocks;
- start, pause, stuck, resume, and completion workflows;
- a Tutor Corner for locally saved questions and error context;
- responsive layouts, visible focus, and reduced-motion support;
- ten rotating inside-joke-style welcome messages.

The release was verified locally in Chrome and Firefox, at desktop and 390 px
phone widths, and again on the deployed GitHub Pages site.

## Product language and identity

- User-facing activities are called **topics** or **learning tasks**, never
  quests. Historical internal names such as `quests.json`, `questProgress`, and
  task IDs remain for save-data compatibility; do not rename them casually.
- The character is named **Tintinsito**.
- Tintinsito is a fluffy, spongy white dog with floppy ears and a small burgundy
  tie. The canonical vector is `assets/tintinsito.svg`.
- Do not describe Tintinsito as a bunny or use the old
  `tintinsito-bunny` profile value. The current profile value is
  `tintinsito-dog`.
- Tintinsito’s speech bubble chooses a joke on page load and is clickable for
  another. The joke collection lives in `js/app.js`.
- Established inside-joke voice includes:
  - “One step closer to being a hacker.”
  - “The front-end queen came back.”
  - “Automation expert on sight!”
- New jokes may expand this voice: affectionate, confident, lightly chaotic,
  and coding-related. Avoid ridicule, guilt, productivity pressure, or jokes
  that imply failure.

## Architecture

This is a static, dependency-free single-page application:

- `index.html` contains the shell and dialogs;
- `css/styles.css` contains all responsive styling;
- `js/app.js` renders views and handles interactions;
- `js/storage.js` owns versioned local persistence and normalization;
- `js/recommendations.js` ranks eligible learning tasks;
- `data/course-topics.json` is the complete syllabus map;
- `data/worlds.json` defines visual course areas;
- `data/quests.json` contains learning tasks and Q&A checks;
- `scripts/validate_content.py` validates content and references;
- `tests/test-plan.md` is the manual browser acceptance plan.

There is no framework, package manager, build step, backend, database, account,
analytics, or tracking. All paths must stay relative because production is
served from the `/java-garden-adventure/` GitHub Pages subpath.

The browser storage key is `javaGardenAdventure.v1`, with schema version 1.
Stable versioned task IDs connect content to saved progress. Preserve those IDs
and the current schema unless a deliberate migration is implemented and tested.

## Data and privacy safeguards

- Never commit real learner names, progress, reflections, errors, tutor
  questions, browser exports, or other personal learning data.
- Do not add telemetry or third-party tracking.
- Clearing site data currently removes progress.
- The original content source was the supplied WS 2025/26 HHU Programmierung
  syllabus CSV. Preserve official topic names and source links, but do not
  reintroduce historical deadlines: the app is intentionally schedule-free.
- The public repository is intentionally unlicensed until the owner chooses a
  license. Do not add one implicitly.

## Product invariants

When extending the application:

- keep the complete course visible in the global topic map;
- keep the garden meaningfully synchronized with course understanding;
- keep recommendations to three or fewer and include a gentle option where
  possible;
- keep correct and incorrect Q&A feedback immediate and explanatory;
- treat getting stuck as useful information, not failure;
- prevent locked tasks from being started or recommended;
- award completion XP only once;
- preserve progress across reloads and safely recover from corrupt saves;
- keep controls labeled, keyboard operable, touch-friendly, and understandable
  without color alone;
- keep the page free of horizontal scrolling at approximately 360 px.

## Local development and validation

Serve the repository root; opening `index.html` directly will block JSON loads:

```bash
python3 -m http.server 8000
```

Run the content validator before every commit:

```bash
python3 scripts/validate_content.py
```

For interaction changes, exercise the relevant path in current Chrome and
Firefox. Check a desktop viewport and a phone viewport near 360–390 px, inspect
the browser console, and follow `tests/test-plan.md` for broader releases.

## GitHub and release workflow

- Keep `main` deployable.
- Work on an `agent/<short-description>` branch.
- Stage only intended files, commit tersely, and open a pull request.
- GitHub Actions runs `scripts/validate_content.py` on pushes and pull requests.
- GitHub Pages publishes the repository root from `main`.
- After merging a user-facing change, wait for Pages deployment and smoke-test
  the production URL before reporting completion.
- Known releases are tagged `v0.1.0`, `v0.2.0`, and `v0.2.1`.

## Likely next work

Confirm priorities with the owner before starting a new feature. The documented
follow-up backlog currently favors:

1. JSON backup export/import and a plain-language backup reminder;
2. an optional timer;
3. more learning tasks in small, reviewed content batches;
4. richer progress and Tutor summaries;
5. additional visual polish without weakening accessibility or calmness.

Do not introduce accounts, synchronization, analytics, AI-generated tutoring,
or a backend without an explicit product decision.
