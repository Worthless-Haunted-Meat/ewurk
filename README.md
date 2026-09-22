# EWURK — Electronic Waste Urban Renewal Kit

The operations system for a nonprofit that takes donated business/church
e-waste, refurbishes it into Linux laptops and tablets, and leases them to
low-income families for $20/month. See `REQUIREMENTS.md` for what it does
and `DESIGN.md` for how it's built.

> Status: v1 complete. All adapters and services are implemented; `npm test`
> runs the full unit/adapter/route suite plus the six Playwright workflow
> specs (see `TASKS.md`) green from a fresh clone.

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
outbox route (`/dev/outbox`) is only available when `NODE_ENV` is not
`production`.

## Hosted environments (Railway)

| Environment | Git branch | URL | `NODE_ENV` |
| --- | --- | --- | --- |
| dev | `develop` | https://dev.ewurk.org | `development` |
| uat | `uat` | https://uat.ewurk.org | `development` |
| production | `main` | https://ewurk.org and https://www.ewurk.org | `production` |

Branch tracking is defined in [`.railway/railway.ts`](.railway/railway.ts); apply
changes with the Railway CLI (`railway config plan` / `railway config apply`)
after merging IaC updates. The Railway service mounts a
volume at `/data`; set `EWURK_DB_PATH=/data/ewurk.db` so the SQLite file
persists across deploys. On first boot the database file is created and
migrated automatically; visit `/` or `/login` to confirm the app is up.

On **dev** and **uat**, Railway sets `EWURK_SEED_ON_BOOT=true`. When
`NODE_ENV` is not `production` and the database has no users yet (typical
first boot on an empty volume), the server runs the same demo seed as
`npm run seed` once at startup. The flag defaults to off locally; production
**never** auto-seeds from this flag, even if it were set.

Railway (and other load balancers) can use `GET /health` — it returns
`200` with `{"status":"ok"}` and does not require a session.

### Seed on a hosted instance

**Dev / uat:** demo data is seeded automatically on first boot when the
volume is empty (see `EWURK_SEED_ON_BOOT` above).

**Production:** there is no auto-seed. Run manually when you need demo or
staff users (shell access or a one-off Railway command):

```sh
EWURK_DB_PATH=/data/ewurk.db npm run seed
```

Use the same `EWURK_DB_PATH` as the running service.

### Sign-in on dev and uat

`NODE_ENV=development`: magic links are written to the in-app dev outbox,
not to real email. After requesting a link, open `GET /dev/outbox` (or
use the same curl flow as local dev above) and follow the verify URL.

### Sign-in on production

`NODE_ENV=production` with no SMTP configuration: requesting a magic link
for a known user shows an error that outbound email is not configured;
`/dev/outbox` is not mounted.

When outbound email is configured, set these variables on the Railway
service (values are secrets — never commit them):

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP server hostname (when set, the app sends real mail) |
| `SMTP_PORT` | Port (default `587`, STARTTLS) |
| `SMTP_USER` | AUTH LOGIN username (optional if server allows) |
| `SMTP_PASS` | AUTH LOGIN password |
| `SMTP_FROM` | Envelope/from address for magic-link mail |

Also set `EWURK_PUBLIC_URL` to the public site origin (e.g.
`https://ewurk.org`) so magic links in email point at the correct host.

## Release promotion

Hosted environments deploy from long-lived Git branches so a production merge
does not update dev and uat at the same time:

1. **Develop** — merge feature PRs into `develop`. Dev (https://dev.ewurk.org)
   tracks `develop`.
2. **UAT** — when ready for acceptance testing, open a PR **from `develop` into
   `uat`**, merge after CI passes. UAT tracks `uat`.
3. **Production** — when UAT is approved, open a PR **from `uat` into `main`**,
   merge after CI passes. Production tracks `main`.

Pull requests targeting `develop`, `uat`, or `main` run lint, typecheck, and
unit tests in GitHub Actions (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

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
