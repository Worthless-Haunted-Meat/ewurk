# EWURK class curriculum

Markdown lessons and a small static site for Saturday instructors. **Attendance lives in [EWURK](https://github.com/Worthless-Haunted-Meat/ewurk)**—create a class session, build the roster from active leases, mark present or absent. This repository only hosts lesson content.

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
