# EWURK curriculum — roadmap

Milestones are ordered by dependency, then user value. Each should be completable in one focused agent session.

## M1: Walking skeleton

Status: [~] in progress

Goal: Project scaffold with lint, typecheck, test, build, and dev server so `GET /` returns 200 before any real lessons exist.

Acceptance:

- [ ] `npm ci` succeeds on a fresh clone
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes with at least one real test (e.g. smoke that `lessons/` directory exists)
- [ ] `npm run build` completes and creates `dist/index.html`
- [ ] `npm run dev` starts; `curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/` returns `200`
- [ ] `README.md` documents install, dev, test, build, and that attendance stays in EWURK

Notes:

- GPL-3.0-or-later `LICENSE`, `engines.node >= 22.5.0`, ESM + `.js` import extensions in `src/`.
- No lesson content required yet; placeholder index is fine.

## M2: Lesson contract and validator

Status: [ ] todo

Goal: Define the required markdown headings and enforce them with automated tests on every file in `lessons/`.

Acceptance:

- [ ] `src/lessonSchema.ts` (or equivalent) documents required sections: Goal, Materials, Steps, chaotic fallback, Done looks like
- [ ] `npm test` fails if a lesson file is missing a section or has fewer than 3 or more than 5 steps under `## Steps`
- [ ] `lessons/README.md` or template file shows authors how to write a valid lesson
- [ ] All quality-bar commands from SPEC.md still pass

Notes:

- Add one intentionally complete **fixture** lesson used only for tests, or a single real Lesson 1 draft—either is fine if tests are real.

## M3: Lessons 1–4

Status: [ ] todo

Goal: Publish the first month’s first four instructor-ready lessons (welcome, browser, files, typing).

Acceptance:

- [ ] `lessons/01-welcome-linux-desktop.md` through `lessons/04-typing-and-text.md` exist and pass structure tests
- [ ] Each lesson includes goal, materials, 3–5 steps, 10-minute fallback, and done criteria; no family PII
- [ ] `npm run build` emits HTML for lessons 1–4
- [ ] Index at `dist/index.html` links to all existing lessons
- [ ] `npm test` and full quality bar pass

Notes:

- Wording must allow a non-teacher to run Lesson 1 from the built page alone.

## M4: Lessons 5–7

Status: [ ] todo

Goal: Add online safety, search literacy, and pictures/screenshots lessons for Saturdays 5–7.

Acceptance:

- [ ] `lessons/05-staying-safe-online.md`, `06-search-and-trust.md`, `07-pictures-and-screenshots.md` exist and pass structure tests
- [ ] No paid SaaS, Windows-only steps, or home-broadband assumptions
- [ ] `npm run build` and `npm test` pass; index links lessons 1–7

Notes:

- Keep activities feasible on shared lab Linux desktops.

## M5: Lessons 8–10 and index completeness

Status: [ ] todo

Goal: Finish the ten-lesson first-month sequence and ensure the index lists `Lesson N — …` titles matching the EWURK convention in SPEC.md.

Acceptance:

- [ ] `lessons/08-email-basics.md`, `09-fixing-common-problems.md`, `10-month-celebration.md` exist and pass structure tests
- [ ] Exactly ten lesson files numbered `01`–`10`; `npm test` fails if any number is missing or duplicated
- [ ] Index displays `displayTitle` form `Lesson N — Title` for each entry
- [ ] Full quality bar passes

Notes:

- Email lesson uses generic webmail in browser; examples use fictional addresses only.

## M6: Print-friendly HTML and instructor README

Status: [ ] todo

Goal: Make built pages easy to read and print in class, and document how instructors pair sessions with EWURK.

Acceptance:

- [ ] Shared CSS in build output: readable typography, `@media print` hides nav chrome
- [ ] `README.md` includes a short **Instructor** section: EWURK roster/attendance vs this repo; title matching; no attendance here
- [ ] `curl -s http://localhost:PORT/lessons/01-welcome-linux-desktop.html` (or actual slug) returns 200 after `npm run build` and `npm start`
- [ ] `npm test` includes a check that every `lessons/*.md` file is linked from generated `dist/index.html`
- [ ] Full quality bar passes

Notes:

- Do not add EWURK code changes; link to EWURK repo/docs only.

## M7: Polish and release readiness

Status: [ ] todo

Goal: README complete, edge cases handled, fresh-clone verification documented for maintainers.

Acceptance:

- [ ] `README.md` covers license (GPL-3.0), lesson numbering, EWURK topic convention, and all npm scripts
- [ ] `npm test` covers index↔file link symmetry (no broken hrefs, no orphan lesson files)
- [ ] Build fails or tests fail on invalid lesson markdown (clear error message)
- [ ] Maintainer checklist in README: clone → `npm ci` → `npm test` → `npm run build` → `npm start` → open `/`
- [ ] Full quality bar passes on a clean tree with no generated artifacts committed except as documented (prefer `dist/` gitignored, built in CI)

Notes:

- Optional: GitHub Actions workflow mirroring EWURK’s lint/test/build—only if requested in a later ops task; not required for v1 product acceptance unless added here in session.
