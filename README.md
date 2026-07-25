# Java Garden Adventure

Java Garden Adventure is a gentle, schedule-free companion for an introductory
Java course. It presents the complete syllabus as topics and subtopics,
recommends a few small learning tasks based on the learner's current energy and
available time, and records progress locally in the browser.

Live site: <https://juanstucker.github.io/java-garden-adventure/>

## Current features

- a global map of all 15 syllabus topics and 30 named subtopics;
- understood, unclear, and unchecked states derived from tasks or set manually;
- nine hand-curated learning tasks covering Hello World, loops and methods, and
  arrays;
- interactive multiple-choice checks with immediate correct/incorrect feedback;
- low, medium, high, and surprise-me recommendations;
- task prerequisites, hints, evidence checks, confidence, and XP;
- start, pause, stuck, resume, and completion workflows;
- a Tutor Corner for saved questions and error context;
- a 15-bed garden that mirrors understanding across the complete course;
- responsive, keyboard-friendly pages with reduced-motion support;
- local-only progress with no account, tracking, backend, or database.

This companion does not replace the official course pages, exercises, lectures,
or tutor. Every course topic links to its corresponding HHU Programmierung page.

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

The validator checks course topics, subtopics, stable task IDs, world references,
prerequisites, cycles, multiple-choice answer definitions, evidence requirements,
and local assets. GitHub Actions runs the same check on pushes and pull requests.

## Content editing

The complete syllabus map lives in `data/course-topics.json`, world definitions
live in `data/worlds.json`, and learner activities live in `data/quests.json`.
The historical filename is retained for progress compatibility. Progress is
linked through stable task IDs, so reordering content does not erase browser
progress.

When adding a learning task:

1. choose a descriptive ID that ends in a version, such as
   `arrays-solo-sum-values-v1`;
2. reference an existing world;
3. reference only existing prerequisite IDs;
4. include instructions, evidence checks, and progressive hints;
5. optionally include validated multiple-choice questions with explanations;
6. run the validator before committing.

The initial content was adapted from the supplied Winter Semester 2025/26 HHU
Programmierung syllabus. Historical course deadlines are deliberately absent
because this app is schedule-free.

## Privacy and storage

The public repository contains only application and course-content files.
Learner names, progress, reflections, confidence, error messages, and tutor
questions remain in that learner's browser via `localStorage`.

Clearing browser site data removes progress. JSON backup import/export is
planned for a follow-up release.

## Repository status

This repository currently has no open-source license. Public visibility allows
the GitHub Pages site to load; it does not grant reuse rights.
