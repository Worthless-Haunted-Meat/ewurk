# EWURK class curriculum

Markdown lessons and a small static site for Saturday instructors. **Attendance lives in [EWURK](https://github.com/Worthless-Haunted-Meat/ewurk)**—create a class session, build the roster from active leases, mark present or absent. This repository only hosts lesson content.

## Instructor

1. **Before class:** run `npm run build` (or use a hosted copy of `dist/`), open the index, and print or project the lesson for today—e.g. `/lessons/01-welcome-linux-desktop.html`. Read the steps aloud; you do not need another lesson plan.
2. **In EWURK:** create a class session whose **topic** matches the lesson title exactly, e.g. `Lesson 3 — Files and folders` (see [Lesson numbering](#lesson-numbering) below). Use **Build roster** so every family on an active lease appears; this curriculum does not build rosters.
3. **After class:** mark each family **present** or **absent** in EWURK only. Nothing in this repo records attendance.
4. **Print tip:** lesson pages hide the “All lessons” link when printed (`@media print` in `style.css`).

## Lesson numbering

| Where | Format | Example |
| --- | --- | --- |
| Files in `lessons/` | `NN-slug.md` (zero-padded) | `03-files-and-folders.md` |
| EWURK session **topic** | `Lesson N — Title` (no zero pad) | `Lesson 3 — Files and folders` |
| Built HTML | `/lessons/NN-slug.html` | `/lessons/03-files-and-folders.html` |

The first month is **ten** lessons (`01`–`10`). Tests enforce no gaps or duplicates. Authoring rules: `lessons/README.md`.

## Maintainer checklist (fresh clone)

From the repository root, work inside `curriculum/`:

```bash
cd curriculum
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Then open `http://localhost:3000/` (or your `PORT`). You should see the index with all ten lessons linked.

- **`dist/` is gitignored** — generate it with `npm run build`; do not commit built HTML.
- **`node_modules/` is gitignored** — use `npm ci`, not `npm install`, to keep the lockfile stable.
- Product spec and roadmap live at the repo root: `SPEC.md`, `ROADMAP.md`.

## Quick start

```bash
cd curriculum
npm ci
npm test
npm run build
npm run dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from `package-lock.json`. |
| `npm run dev` | Build `dist/` and start a local static server with reload. |
| `npm start` | Serve `dist/` (run `npm run build` first). |
| `npm run build` | Validate lessons, then write `dist/index.html` and `dist/lessons/*.html`. Fails on invalid markdown. |
| `npm test` | Unit tests (`node --test`), including lesson structure and index↔file symmetry. |
| `npm run typecheck` | TypeScript check for `src/` and `test/`. |
| `npm run lint` | ESLint over the package. |
| `npm run lint:fix` | ESLint with auto-fix. |

## EWURK session titles

When you create a class session in EWURK, set **topic** to the same string shown on the curriculum index, e.g. `Lesson 2 — Browser basics`. Full convention: `SPEC.md` at the repository root.

## License

[GPL-3.0-or-later](https://www.gnu.org/licenses/gpl-3.0.html). Canonical license text: `LICENSE` in the parent repository (EWURK monorepo layout). Lesson content is documentation under the same license.
