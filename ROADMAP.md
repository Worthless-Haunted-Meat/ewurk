# EWURK curriculum — roadmap

Milestones are ordered by dependency, then user value. Each should be completable in one focused agent session.

## M1: Walking skeleton

Status: [x] done

Goal: Project scaffold with lint, typecheck, test, build, and dev server so `GET /` returns 200 before any real lessons exist.

Acceptance:

- [x] `npm ci` succeeds on a fresh clone
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm test` passes with at least one real test (e.g. smoke that `lessons/` directory exists)
- [x] `npm run build` completes and creates `dist/index.html`
- [x] `npm run dev` starts; `curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/` returns `200`
- [x] `README.md` documents install, dev, test, build, and that attendance stays in EWURK

Notes:

- GPL-3.0-or-later `LICENSE`, `engines.node >= 22.5.0`, ESM + `.js` import extensions in `src/`.
- No lesson content required yet; placeholder index is fine.
- Scaffold lives in `curriculum/` beside the EWURK app on this branch; run all npm commands from `curriculum/` until the dedicated `ewurk-curriculum` repo is split out.

## M2: Lesson contract and validator

Status: [x] done

Goal: Define the required markdown headings and enforce them with automated tests on every file in `lessons/`.

Acceptance:

- [x] `src/lessonSchema.ts` (or equivalent) documents required sections: Goal, Materials, Steps, chaotic fallback, Done looks like
- [x] `npm test` fails if a lesson file is missing a section or has fewer than 3 or more than 5 steps under `## Steps`
- [x] `lessons/README.md` or template file shows authors how to write a valid lesson
- [x] All quality-bar commands from SPEC.md still pass

Notes:

- Add one intentionally complete **fixture** lesson used only for tests, or a single real Lesson 1 draft—either is fine if tests are real.
- Shipped draft `lessons/01-welcome-linux-desktop.md`; invalid cases live under `test/fixtures/`.

## M3: Lessons 1–4

Status: [x] done

Goal: Publish the first month’s first four instructor-ready lessons (welcome, browser, files, typing).

Acceptance:

- [x] `lessons/01-welcome-linux-desktop.md` through `lessons/04-typing-and-text.md` exist and pass structure tests
- [x] Each lesson includes goal, materials, 3–5 steps, 10-minute fallback, and done criteria; no family PII
- [x] `npm run build` emits HTML for lessons 1–4
- [x] Index at `dist/index.html` links to all existing lessons
- [x] `npm test` and full quality bar pass

Notes:

- Wording must allow a non-teacher to run Lesson 1 from the built page alone.
- Build uses `marked` for lesson HTML; `lessonMeta.ts` supplies EWURK-style index titles.

## M4: Lessons 5–7

Status: [x] done

Goal: Add online safety, search literacy, and pictures/screenshots lessons for Saturdays 5–7.

Acceptance:

- [x] `lessons/05-staying-safe-online.md`, `06-search-and-trust.md`, `07-pictures-and-screenshots.md` exist and pass structure tests
- [x] No paid SaaS, Windows-only steps, or home-broadband assumptions
- [x] `npm run build` and `npm test` pass; index links lessons 1–7

Notes:

- Keep activities feasible on shared lab Linux desktops.
- Lesson 7 assumes staff pre-seeds `Saturday/shared/sample.jpg` on lab machines.

## M5: Lessons 8–10 and index completeness

Status: [x] done

Goal: Finish the ten-lesson first-month sequence and ensure the index lists `Lesson N — …` titles matching the EWURK convention in SPEC.md.

Acceptance:

- [x] `lessons/08-email-basics.md`, `09-fixing-common-problems.md`, `10-month-celebration.md` exist and pass structure tests
- [x] Exactly ten lesson files numbered `01`–`10`; `npm test` fails if any number is missing or duplicated
- [x] Index displays `displayTitle` form `Lesson N — Title` for each entry
- [x] Full quality bar passes

Notes:

- Email lesson uses generic webmail in browser; examples use fictional addresses only.
- `lessonSequence.ts` + `lessonSequence.test.ts` enforce the 01–10 set.

## M6: Print-friendly HTML and instructor README

Status: [x] done

Goal: Make built pages easy to read and print in class, and document how instructors pair sessions with EWURK.

Acceptance:

- [x] Shared CSS in build output: readable typography, `@media print` hides nav chrome
- [x] `README.md` includes a short **Instructor** section: EWURK roster/attendance vs this repo; title matching; no attendance here
- [x] `curl -s http://localhost:PORT/lessons/01-welcome-linux-desktop.html` (or actual slug) returns 200 after `npm run build` and `npm start`
- [x] `npm test` includes a check that every `lessons/*.md` file is linked from generated `dist/index.html`
- [x] Full quality bar passes

Notes:

- Do not add EWURK code changes; link to EWURK repo/docs only.
- Print styles live in `src/siteCss.ts`; `serverSmoke.test.ts` covers lesson URL 200.

## M7: Polish and release readiness

Status: [~] in progress

Goal: README complete, edge cases handled, fresh-clone verification documented for maintainers.

Acceptance:

- [ ] `README.md` covers license (GPL-3.0), lesson numbering, EWURK topic convention, and all npm scripts
- [ ] `npm test` covers index↔file link symmetry (no broken hrefs, no orphan lesson files)
- [ ] Build fails or tests fail on invalid lesson markdown (clear error message)
- [ ] Maintainer checklist in README: clone → `npm ci` → `npm test` → `npm run build` → `npm start` → open `/`
- [ ] Full quality bar passes on a clean tree with no generated artifacts committed except as documented (prefer `dist/` gitignored, built in CI)

Notes:

- Optional: GitHub Actions workflow mirroring EWURK’s lint/test/build—only if requested in a later ops task; not required for v1 product acceptance unless added here in session.
