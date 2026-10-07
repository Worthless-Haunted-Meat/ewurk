# EWURK class curriculum — specification (v1)

## 1. Summary

EWURK Curriculum is a small, static content repository that gives Saturday-class instructors a ready-to-teach sequence of lessons for families leasing Linux desktops through EWURK. Instructors use the [EWURK](https://github.com/Worthless-Haunted-Meat/ewurk) web app only for attendance: they create a class session, build the roster from active leases, and mark present or absent. This repository holds the lesson text—goals, materials, steps, and fallbacks—so a volunteer who is not a professional teacher can run class from one page without another document. Materials are English, GPL-3.0, and contain no family PII.

## 2. Core user flows

1. An instructor clones or opens the built site, picks **Lesson *N*** from the index, and reads or prints that lesson before class.
2. On Saturday, the instructor creates an EWURK class session whose **topic** matches the lesson title (e.g. `Lesson 3 — Files and folders`), builds the roster, and teaches from the matching markdown/HTML page.
3. During or after class, the instructor marks attendance in EWURK only; this repo does not record attendance.
4. A maintainer adds or edits a lesson file, runs the quality commands, and confirms tests enforce required headings and index links.
5. A maintainer runs the static build and deploys `dist/` (or publishes the repo) so instructors always have the same numbered sequence.

## 3. Non-goals for v1

- **Not an attendance or roster app.** EWURK already has `class_sessions`, roster from active leases, and attendance marks.
- **No changes to the EWURK database or app code** for curriculum integration (no lesson-id column, no API coupling). Optional title convention is documented here only.
- **No lessee/family login**, homework submission portal, grades, or consequences for missed class.
- **No Spanish** or other locales (English first).
- **No homework PDFs** or take-home worksheets (nice-to-have later).
- **No paid SaaS**, classroom management subscriptions, or accounts/secrets to run locally.
- **No Windows-only or licensed instructional software**; assume EWURK’s Linux desktop image (browser, file manager, basic apps).
- **No assumption of home broadband** or a parent who is a developer; in-class activities use lab machines.
- **No collection of SSN, income, or a child’s full school record** in materials (or prompts to collect them).
- **No real family names or PII** in lesson examples; use generic placeholders only.
- **Not a full school-year scope**; exactly **ten** Saturday lessons (~first month), not 40 weeks.

## 4. Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Language | **TypeScript** (ESM, `NodeNext`) | Same conventions as EWURK; strict typing for validators. |
| Runtime | **Node.js ≥ 22.5** | Matches EWURK; `node --test` built in; no native addons required. |
| Content | **Markdown** in `lessons/` | Easy for non-dev instructors to read in GitHub or print from HTML. |
| HTML build | **Small Node script** + **marked** (or equivalent pure-JS markdown parser) | Boring, fast, no framework; emits `dist/` for offline/print. |
| Dev server | **Express** static `dist/` (or `public/` + on-the-fly build in dev) | Same dependency family as EWURK; `GET /` serves the index. |
| Storage | **None** (files on disk) | Curriculum is source files; no database. |
| Test runner | **`node --test`** | Zero extra test framework; validates lesson shape and links. |
| Lint | **ESLint** (flat config) + **TypeScript** `tsc --noEmit` | Consistent quality bar with EWURK. |

One sentence: **TypeScript on Node 22 with markdown sources, a tiny static HTML build, and `node --test` validators**—minimal dependencies, strong local tooling, no services.

## 5. Architecture

```
ewurk-curriculum/
├── SPEC.md / ROADMAP.md
├── README.md                 # Instructor + maintainer: EWURK vs this repo
├── LICENSE                   # GPL-3.0-or-later
├── package.json
├── tsconfig.json
├── eslint.config.js
├── lessons/
│   ├── 01-welcome-linux-desktop.md
│   ├── …                     # 02–09
│   └── 10-month-celebration.md
├── src/
│   ├── build.ts              # lessons/*.md → dist/lessons/*.html + dist/index.html
│   ├── lessonSchema.ts       # Required heading names, parsing helpers
│   └── server.ts             # dev/prod static server (GET /, /lessons/*)
├── scripts/                  # optional thin CLIs wired from package.json
└── test/
    ├── lessonStructure.test.ts # every lesson file: required sections present
    └── indexLinks.test.ts      # index lists 1–10 and links exist
```

**Data flow:** Markdown on disk is the source of truth. Tests scan `lessons/` and fail if structure or numbering is wrong. `npm run build` writes `dist/`. `npm run dev` / `npm start` serves `dist/` so instructors hit `/` for the index and `/lessons/02-browser-basics.html` (exact URLs finalized in M1/M6). EWURK is out of band: instructors manually align session **topic** with lesson title.

**EWURK session title convention (v1, documentation only):**

- Format: `Lesson <n> — <short title>` (em dash, space around dash, title case after the number).
- `<n>` is 1–10 with no leading zero in EWURK UI; files use zero-padded prefixes (`01-`, `02-`, …) for sort order.
- Example EWURK topic: `Lesson 2 — Browser basics` → file `lessons/02-browser-basics.md`.
- EWURK stores this string in `class_sessions.topic` (free text today); no schema change required.

## 6. Data model

No database. Logical entities:

### Lesson (file-backed)

| Field | Source | Notes |
| --- | --- | --- |
| `number` | Filename prefix `NN-` | Integer 1–10, unique. |
| `slug` | Filename without `.md` | e.g. `02-browser-basics`. |
| `title` | First heading or YAML-free title line | Human title after the number (e.g. “Browser basics”). |
| `displayTitle` | Derived | `Lesson {number} — {title}` for EWURK and index. |
| `goal` | `## Goal` section | One short paragraph. |
| `materials` | `## Materials` | Bulleted list; lab PCs only unless noted. |
| `steps` | `## Steps` | 3–5 numbered substeps (enforced by test). |
| `fallback` | `## If the room is chaotic (10 minutes)` | Short alternate activity. |
| `done` | `## Done looks like` | Observable outcomes for instructor. |
| `durationMinutes` | Documented in README / lesson intro | Target 60–90 minutes total. |

### Index (generated + source)

| Field | Notes |
| --- | --- |
| `lessons[]` | Ordered list of `{ number, displayTitle, href }` built from disk at build/test time. |

### Build artifact

| Path | Notes |
| --- | --- |
| `dist/index.html` | Linked list of all lessons. |
| `dist/lessons/<slug>.html` | Single-page lesson for read/print. |

## 7. Quality bar

From a fresh clone, after `npm ci` (and one-time `npx playwright install chromium` only if e2e is added later—**v1 unit tests only, no Playwright required**):

| Command | Must pass before any milestone is “done” |
| --- | --- |
| `npm ci` | Install locked dependencies. |
| `npm run typecheck` | `tsc --noEmit` over `src/` and `test/`. |
| `npm run lint` | ESLint clean. |
| `npm test` | All unit/structure tests green. |
| `npm run build` | Produces `dist/` with index + lesson pages. |
| `npm run dev` | Local server; `GET /` returns **200** (manual or scripted smoke). |

Optional maintainer check (documented in README, not gating v1 CI unless added in M7): open `dist/lessons/01-….html` and confirm print-friendly CSS.

## Planned lesson sequence (content target)

Ten Saturdays, mixed ages, EWURK Linux desktops:

| # | EWURK topic (example) | Theme |
| --- | --- | --- |
| 1 | Lesson 1 — Welcome and the Linux desktop | Login, desktop, shutdown respectfully |
| 2 | Lesson 2 — Browser basics | Tabs, address bar, bookmarks |
| 3 | Lesson 3 — Files and folders | Home folder, open/save, organize |
| 4 | Lesson 4 — Typing and text | Keyboard practice, simple editor |
| 5 | Lesson 5 — Staying safe online | Passwords, privacy, ask an adult |
| 6 | Lesson 6 — Search and trustworthy sites | Search engines, skepticism, citations |
| 7 | Lesson 7 — Pictures and screenshots | View images, screenshot, folder hygiene |
| 8 | Lesson 8 — Email basics (webmail) | Read/send simple mail in browser; no personal data in examples |
| 9 | Lesson 9 — Fixing common problems | Refresh, cables, asking for help |
| 10 | Lesson 10 — Month celebration project | Review skills; small collaborative demo |

Exact wording lives in lesson files during content milestones; numbers and titles stay stable for EWURK matching.
