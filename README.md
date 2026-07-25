# Java Garden Adventure

Java Garden Adventure is a gentle, schedule-free companion for an introductory
Java course. It recommends a few small quests based on the learner's current
energy and available time, then records progress locally in the browser.

Live site: <https://juanstucker.github.io/java-garden-adventure/>

## v0.1 features

- nine hand-curated quests covering Hello World, loops and methods, and arrays;
- low, medium, high, and surprise-me recommendations;
- quest prerequisites, hints, evidence checks, confidence, and XP;
- start, pause, stuck, resume, and completion workflows;
- a Tutor Corner for saved questions and error context;
- a simple garden that grows with completed work;
- responsive, keyboard-friendly pages with reduced-motion support;
- local-only progress with no account, tracking, backend, or database.

This companion does not replace the official course pages, exercises, lectures,
or tutor. Each quest links to its corresponding HHU Programmierung topic page.

## Run locally

The app has no package dependencies or build step. Serve the repository root so
the browser can load the JSON files:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

Opening `index.html` directly as a `file://` URL is not supported because modern
browsers block local JSON requests.

## Validate content

```bash
python3 scripts/validate_content.py
```

The validator checks stable IDs, world references, prerequisite references,
cycles, allowed quest values, evidence requirements, and local assets. GitHub
Actions runs the same check on pushes and pull requests.

## Content editing

World definitions live in `data/worlds.json`; learner activities live in
`data/quests.json`. Progress is linked through stable quest IDs, so reordering
content does not erase browser progress.

When adding a quest:

1. choose a descriptive ID that ends in a version, such as
   `arrays-solo-sum-values-v1`;
2. reference an existing world;
3. reference only existing prerequisite IDs;
4. include instructions, evidence checks, and progressive hints;
5. run the validator before committing.

The initial content was adapted from the supplied Winter Semester 2025/26 HHU
Programmierung syllabus. Historical course deadlines are deliberately absent
because this app is schedule-free.

## Privacy and storage

The public repository contains only application and course-content files.
Learner names, progress, reflections, confidence, error messages, and tutor
questions remain in that learner's browser via `localStorage`.

Clearing browser site data removes progress. JSON backup import/export is
planned for v0.2.

## Repository status

This repository currently has no open-source license. Public visibility allows
the GitHub Pages site to load; it does not grant reuse rights.
