# EWURK — Electronic Waste Urban Renewal Kit

The operations system for a nonprofit that takes donated business/church
e-waste, refurbishes it into Linux laptops and tablets, and leases them to
low-income families for $20/month. See `REQUIREMENTS.md` for what it does
and `DESIGN.md` for how it's built.

> Status: blueprint stage. Routes, views, and data model are wired; the
> adapters and services that hold the actual business logic are stubs that
> throw `not implemented` until their tasks land (see `TASKS.md`).

## Install

```sh
npm ci
npx playwright install chromium
```

## Run

```sh
npm run build
npm start
```

Serves on `http://localhost:3000` (override with `PORT`). Data lives in
`data/ewurk.db` (override with `EWURK_DB_PATH`); it is created on first run.

For local development with auto-reload:

```sh
npm run dev
```

## Seed demo data

```sh
npm run seed
```

Populates the demo dataset (R23): one donation with items, five devices
spread across 4+ lifecycle stages, two families (`Herrera Family`,
`Osei Family`) with leases, one device swap, three users (one per role),
one sample payment, and one class session with attendance roster.

The seed is idempotent — safe to run multiple times.

## Sign-in (dev/test)

There is no password table. Request a magic link, then read it from the
local dev outbox (never a real mailbox):

```sh
curl -X POST localhost:3000/auth/magic-link -d '{"email":"staff@ewurk.org"}' -H 'Content-Type: application/json'
curl -s localhost:3000/dev/outbox
```

Open the link printed there in your browser to start a session. The
outbox route (`/dev/outbox`) is disabled whenever `NODE_ENV=production`.

## Test

```sh
npm run lint
npm run typecheck
npm test
```

`npm test` runs the Node built-in test suite (`test/*.test.ts`, unit +
adapter + route tests) and then the Playwright browser suite
(`test/e2e/*.spec.ts`), which builds the app and serves it against a fresh
seeded database on port 4310.

## Layout

See `DESIGN.md` §1 for the full file layout and §3 for the port/service
contracts every adapter and service must satisfy.

## License

GPL-3.0-or-later. See `LICENSE`.
