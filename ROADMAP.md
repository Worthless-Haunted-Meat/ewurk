# EWURK lease economics — roadmap

All commands below are run from `ewurk-lease-economics/` after that directory
exists. Milestones do not modify EWURK ops payment or lease code under the
repository root `src/`.

## M1: Walking skeleton
Status: [x] done
Goal: Scaffold the isolated package with lint, typecheck, test, build, and a trivial HTTP 200 on `GET /`.
Acceptance:
- [x] `ewurk-lease-economics/package.json` exists with scripts `dev`, `build`, `start`, `test`, `lint`, `typecheck`
- [x] `cd ewurk-lease-economics && npm ci && npm test` passes with at least one real test (e.g. smoke `GET /`)
- [x] `cd ewurk-lease-economics && npm run dev` starts; `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/` returns `200` (document default `PORT` in README)
- [x] `ewurk-lease-economics/README.md` documents clone path, `cd ewurk-lease-economics`, and install/run commands
Notes:
- Use GPL-3.0 `LICENSE` in `ewurk-lease-economics/`.
- Default port should not collide with root EWURK (3000); use 3001 or `PORT`.
- Root `eslint.config.js` ignores `ewurk-lease-economics/**`; lint runs inside the subpackage only.

## M2: Integer cents domain model
Status: [x] done
Goal: Implement and test core recovery math in pure modules with fixture numbers only.
Acceptance:
- [x] `cd ewurk-lease-economics && npm test` includes tests for `cost_cents_per_available` and `months_to_recover` using obviously fake cent values
- [x] `cd ewurk-lease-economics && npm run typecheck` passes
- [x] README states rounding rule for division and that money is integer cents only
Notes:
- `monthly_lease_cents` defaults to 2000; tests may override with labeled fixtures.
- Batch and labor division use round-half-up; months-to-recover uses ceiling at lease cents.

## M3: CSV template and parser
Status: [x] done
Goal: Ship an empty/labeled template and strict CSV ingest with validation errors.
Acceptance:
- [x] File `ewurk-lease-economics/templates/inputs.template.csv` exists with header row and an `example` row clearly marked, no implied real shop costs
- [x] `cd ewurk-lease-economics && npm test` covers `parseInputsCsv` (missing column, negative cents, `units_reach_available > units_donated` fails)
- [x] README lists which columns must be filled from the shop
Notes:
- Reject float dollar strings; accept integer cents columns only.
- Blank template row after `example` is skipped by the parser.

## M4: CLI recovery table
Status: [x] done
Goal: Operators run one command to print months-to-recover from a CSV file.
Acceptance:
- [x] `cd ewurk-lease-economics && npm run build && node dist/cli.js fixtures/shop-fixture.csv` exits 0 and prints `months_to_recover` and `cost_cents_per_available`
- [x] `cd ewurk-lease-economics && npm test` includes a CLI integration test or snapshot of stdout for the fixture file
- [x] Output includes the fixed policy sentence that non-payment is not lockout
Notes:
- `npm run calculate` script wraps the CLI entry.
- `npm test` runs `build` first so `dist/cli.js` exists for the spawn test.

## M5: Swap/repair and yield scenarios
Status: [x] done
Goal: Show how one swap/repair and never-leased units affect effective cost and recovery months.
Acceptance:
- [x] `cd ewurk-lease-economics && npm test` covers yield (`units_donated` vs `units_reach_available`) and `swap_repair_cents` with fixture math
- [x] CLI (or second output section) prints `months_after_swap` when `swap_repair_cents` > 0
- [x] README explains never-leased units as dilution of batch yield, not a lessee penalty
Notes:
- No output field may suggest disabling a device.
- CLI adds a `yield:` narrative line for batch dilution context.

## M6: Web UI for CSV upload
Status: [x] done
Goal: Browser-based path: upload CSV, see the same recovery table as the CLI.
Acceptance:
- [x] `cd ewurk-lease-economics && npm run dev` serves a page with CSV upload or paste
- [x] Uploading `fixtures/shop-fixture.csv` shows `months_to_recover` in the HTML response
- [x] `cd ewurk-lease-economics && npm test` includes HTTP test for successful parse (status 200 and expected substring)
Notes:
- Keep UI minimal; no auth, no persistence.
- File upload reads CSV in the browser then posts `csv_text` (no multipart parser on server).

## M7: Polish and release readiness
Status: [~] in progress
Goal: README complete, error states handled, fresh-clone verification documented.
Acceptance:
- [ ] `ewurk-lease-economics/README.md` explains lease-as-nudge (not rent), shop-sourced inputs, and explicit non-goals
- [ ] `cd ewurk-lease-economics && npm run lint && npm run typecheck && npm test && npm run build` all exit 0
- [ ] README “Fresh clone check” section: clone repo, `cd ewurk-lease-economics`, `npm ci`, `npm test`, `npm run calculate -- templates/inputs.template.csv` (with example row) succeeds
- [ ] Invalid CSV shows a clear error in CLI (non-zero exit) and web UI (4xx/422 with message) without stack trace to the user
Notes:
- Confirm root EWURK app still builds if documented as optional sanity check; economics package must not depend on EWURK DB.
