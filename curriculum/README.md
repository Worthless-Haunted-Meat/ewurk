# EWURK class curriculum

Markdown lessons and a small static site for Saturday instructors. **Attendance lives in [EWURK](https://github.com/Worthless-Haunted-Meat/ewurk)**—create a class session, build the roster from active leases, mark present or absent. This repository only hosts lesson content.

## Instructor

1. **Before class:** run `npm run build` (or use a hosted copy of `dist/`), open the index, and print or project the lesson for today—e.g. `/lessons/01-welcome-linux-desktop.html`. Read the steps aloud; you do not need another lesson plan.
2. **In EWURK:** create a class session whose **topic** matches the lesson title exactly, e.g. `Lesson 3 — Files and folders` (see `SPEC.md` at the repo root). Use **Build roster** so every family on an active lease appears; this curriculum does not build rosters.
3. **After class:** mark each family **present** or **absent** in EWURK only. Nothing in this repo records attendance.
4. **Print tip:** lesson pages hide the “All lessons” link when printed (`@media print` in `style.css`).

## Quick start

From this directory (`curriculum/`):

```bash
npm ci
npm test
npm run build
npm run dev
```

Open `http://localhost:3000/` (or set `PORT`). `GET /` should return the lesson index.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies (use in CI and fresh clones). |
| `npm run dev` | Build `dist/` and start a local static server with reload. |
| `npm start` | Serve `dist/` (run `npm run build` first). |
| `npm run build` | Generate `dist/index.html` and assets under `dist/`. |
| `npm test` | Unit and layout checks (`node --test`). |
| `npm run typecheck` | TypeScript check for `src/` and `test/`. |
| `npm run lint` | ESLint. |

## EWURK session titles

When you create a class session in EWURK, set **topic** to match the lesson, e.g. `Lesson 2 — Browser basics`. See `SPEC.md` at the repository root for the full convention.

## License

GPL-3.0-or-later. See `LICENSE` in the parent repository.
