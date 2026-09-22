# AGENTS.md

## What this project is

EWURK (Electronic Waste Urban Renewal Kit) is the operations web app for a
nonprofit that intakes donated e-waste, refurbishes devices, and leases them to
low-income families. It is Express + server-rendered EJS views over SQLite
(`node:sqlite`). "Working" means `npm run build && npm start` serves the app,
migrations apply on first open of the DB file, and `npm test` is green (unit +
Playwright e2e).

## Layout

- `src/server.ts` — process entry: open DB, optional seed-on-boot, listen.
- `src/app.ts` — Express app factory (`createApp`), routes, `GET /health`.
- `src/deps.ts` — `AppDeps` composition-root type.
- `src/seed.ts` — demo dataset (`npm run seed`); idempotent R23 literals.
- `src/seedOnBoot.ts` — `EWURK_SEED_ON_BOOT` gate for non-production hosts.
- `src/db/` — `schema.sql`, `connection.ts`, `migrate.ts`.
- `src/domain/`, `src/ports/` — pure types and store/service interfaces.
- `src/adapters/` — SQLite, mail, clock implementations.
- `src/services/` — business logic (auth, donations, devices, leases, etc.).
- `src/http/` — middleware, routes, errors.
- `views/`, `public/` — EJS templates and static assets.
- `test/*.test.ts` — Node built-in test runner (unit, adapters, routes).
- `test/e2e/*.spec.ts` — Playwright workflows; `test/helpers/` for fakes.
- `.railway/railway.ts` — Railway Infrastructure as Code (CLI `railway config plan|apply`); not compiled by `tsc` (`rootDir` is `src/` only).

## Commands

| Purpose | Command | Notes |
| --- | --- | --- |
| Install | `npm ci` | Never `npm install`; keep the lockfile stable. |
| Playwright browser | `npx playwright install chromium` | Required once per machine for `npm test`. |
| Typecheck | `npm run typecheck` | `tsc --noEmit` over `src/`. |
| Lint | `npm run lint` | ESLint flat config; fix with `npm run lint:fix`. |
| Test | `npm test` | Unit tests then Playwright e2e (builds app, port 4310). |
| Build | `npm run build` | Emits `dist/` and copies `src/db/schema.sql`. |
| Production run | `npm start` | `node dist/server.js`; uses `PORT` (default 3000). |
| Dev server | `npm run dev` | `tsx watch src/server.ts`. |
| Seed demo data | `npm run seed` | `tsx src/seed.ts`; uses `EWURK_DB_PATH` if set. |

## Conventions

- TypeScript strict, ESM, `NodeNext` — every relative import uses a `.js` extension.
- Errors: throw `AppError` from `src/http/errors.ts` in HTTP layer; services use domain rules.
- Logging: avoid `console.log` in `src/` except CLI entry summaries in `seed.ts`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), one concern per commit.

## Environment (hosted)

- `EWURK_DB_PATH` — SQLite file path (Railway: `/data/ewurk.db` on the `/data` volume).
- `NODE_ENV` — `production` on prod; `development` on dev/uat (dev outbox, no auto SMTP).
- `EWURK_PUBLIC_URL` — public origin for magic links.
- `EWURK_SEED_ON_BOOT` — when truthy and not production, seeds an **empty** DB at startup (see README).
- Optional SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## Never

- Do not edit `REQUIREMENTS.md`, `DESIGN.md`, `QUALITY.md`, `TASKS.md`, or `QA.md` unless asked.
- Do not modify `.github/workflows/` or deployment secrets without being asked.
- Do not commit secrets, `.env` files, or generated artifacts (`dist/`, `*.db`).
- Do not add runtime dependencies without stating why in the PR description.

## Definition of done for any change

1. `npm run typecheck`, `npm run lint`, and `npm test` pass locally.
2. New behavior has a test (new file or extend only when brief allows).
3. User-facing env or ops behavior is documented in `README.md`.
4. Working tree is clean with clear conventional commit messages.
