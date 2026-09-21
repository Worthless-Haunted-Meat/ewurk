# EWURK — Quality standard

Stack: Node.js (>=22.5) + TypeScript, Express, server-rendered EJS views,
Node's built-in `node:sqlite` (no native addon), `node:test` for unit/API
tests, Playwright Test for browser-flow tests. See `REQUIREMENTS.md` §
Decisions for why `node:sqlite` over a native binding.

## 1. Quality bar

Every command below must exit 0 before any task is considered done.

| Purpose | Command | Notes |
| --- | --- | --- |
| Install | `npm ci && npx playwright install chromium` | Installs deps and the one browser the browser tests need. No other browsers. |
| Lint | `npm run lint` | ESLint (`typescript-eslint` recommended config). |
| Typecheck | `npm run typecheck` | `tsc --noEmit`, strict mode. |
| Test | `npm test` | Runs `node --test` (unit/API, tagged by requirement id) then `playwright test` (browser flows) against a locally started instance. Both must pass. |
| Build | `npm run build` | `tsc -p tsconfig.json` to `dist/`. |

Start command and probe:

```json quality
{ "bar": { "install": "npm ci && npx playwright install chromium", "lint": "npm run lint", "typecheck": "npm run typecheck", "test": "npm test", "build": "npm run build" },
  "start": { "command": "npm start", "probe": { "http": "/", "expect": 200, "timeout_s": 30 } },
  "hygiene_never_tracked": ["node_modules/", "dist/", "build/", "coverage/", "*.db", "*.sqlite", "*.sqlite3", ".env", ".qwen/", ".aider*", ".cursor/worktrees/", ".playwright-mcp/", "playwright-report/", "test-results/"],
  "rubric_targets": { "correctness": 5, "security": 5, "validation": 4, "tests": 4, "structure": 4, "ux": 4, "readme": 4 } }
```

`npm run seed` populates `data/ewurk.db` with the R23 demo data; it is not
part of the pass/fail bar itself but is exercised by a test (see § 3) and is
required for `npm start` to be explorable per README.

## 2. Code rules

- Interfaces are segregated per consumer: a route handler or service depends
  on the smallest port it needs (e.g. the lease service depends on a
  `PaymentLedger` interface with only the methods it calls, not the whole
  repository object).
- Dependencies are injected; no import-time side effects. No module opens a
  DB connection, reads an env var for configuration, or registers a route as
  a consequence of being `import`ed — that only happens in one composition
  root (`src/app.ts` / `src/server.ts`).
- One JSON error envelope, `{"error":{"code":"...","message":"..."}}`, on
  every API route; an unknown path under `/api` returns a JSON 404 in that
  same shape (R25).
- User data is escaped at every render and copy boundary: EJS templates use
  `<%= %>` for any request- or database-sourced string; raw `<%- %>` output
  is never used on user-supplied data (only on the app's own trusted static
  partials).
- Nothing needed to run from a clean clone is left undocumented — the README
  lists every command from `git clone` to a working, seeded app in a
  browser.
- Device status changes only through one guarded transition function
  (e.g. `transitionDevice(device, to, actor, payload)`); no other code path
  writes `devices.status` directly. This is what makes "no device reaches
  available without a wipe record" structural rather than a reminder.
- All money is stored and computed as integer cents (`*_cents` columns/
  fields); no floating-point arithmetic touches currency anywhere.
- The family/lessee schema has no SSN, bank-account, or income columns —
  enforced at the schema level, not just left off a form.
- No route, background job, or scheduled task changes a device's or
  family's state as a consequence of a "behind" payment status, other than
  computing the read-only status label itself.
- Magic-link tokens are single-use, expiring, and stored hashed; the dev
  outbox (`/dev/outbox`) that stands in for a mail provider is disabled
  outside development/test and never appears in production configuration.

## 3. Test rules

- Every acceptance criterion `R1`..`R25` has at least one test whose name or
  `describe` block is tagged with its id (e.g. `test('[R6] device cannot
  reach available without a wipe record', ...)`).
- Tests are written before the corresponding implementation task and
  confirmed to fail (red) first; the task report says so.
- Tests import and exercise the real modules/routes — no reimplementation of
  the thing under test standing in as its own fake.
- The crew never edits an existing test file or a tooling/config file
  (`eslint.config.*`, `tsconfig.json`, `playwright.config.*`,
  `package.json` scripts) to make a check pass; if a check looks wrong, it
  is reported, not edited around.
- Every browser-flow requirement — R1, R2, R3, R5 (UI half), R6 (UI half),
  R7, R8, R9, R10, R11, R12, R13, R14, R16, R17, R18, R19, R20, R21, R22 (UI
  half) — has a Playwright test that drives the actually-running app,
  asserts on visible text/roles (not implementation details), and runs
  under `npm test`.
- The seed script's output (R23: 1 donation with items, 5 devices across
  ≥4 stages, 2 leases, 1 swap) is itself asserted by a test, not just
  eyeballed.
- Invariant requirements (R4 no dollar value, R6 wipe-before-available, R15
  no automated enforcement, R22 minimal PII) each have a test that attempts
  the forbidden path directly (e.g. POST straight to `available` with no
  wipe) and asserts it is rejected, in addition to their happy-path test.

## 4. Rubric

Scored 1–5 by an independent reviewer against `REQUIREMENTS.md`.

| Criterion | Target | Why |
| --- | --- | --- |
| Correctness against requirements | 5 | The wipe gate and no-value-on-acknowledgment are liability-critical; "mostly correct" is not an acceptable bar here. |
| Security | 5 | Minimal PII on low-income households and minors, hashed single-use auth tokens, no automated action against a family for non-payment — these are explicit non-negotiables in the brief. |
| Validation and error handling | 4 | Standard bar: bad input is rejected with the JSON error envelope, never a silent no-op or a 500. |
| Test quality | 4 | Id-tagged, red-first, real-module tests per § 3. |
| Structure and idiom | 4 | Standard bar: follows the code rules in § 2. |
| UX faithfulness | 4 | Mobile-first for intake and device status change; server-rendered; one-screen caseworker view is literally the product's reason to exist. |
| README accuracy from a clean clone | 4 | `git clone` → the commands in the README → a seeded, browsable app, with no undocumented step. |
