# EWURK — Tasks

Six tasks. `T1`–`T5` each implement one bounded context's adapters and
service (currently stubs that throw `not implemented: <name>`) against the
ports and algorithms fixed in `DESIGN.md`; they share no file, but they are
**not** order-independent: `test/devices.test.ts` (R8) calls the real
`LeaseService.createLease`, so `T4` must land before `T3`. The order below is
the order to run. `T6` seeds real
data end-to-end and can only run once `T1`–`T5` are done, since it drives
every service for real. Every task must leave `npm run lint` and
`npm run typecheck` passing across the **whole** repo (not just its own
files) in addition to its own test command.

Do not edit `DESIGN.md`, `REQUIREMENTS.md`, `QUALITY.md`, `TASKS.md`,
`QA.md`, any file under `test/`, `eslint.config.js`, `tsconfig.json`,
`playwright.config.ts`, or the `scripts` block of `package.json`. If one of
these looks wrong, say so in your report — do not edit it.

## T1: Foundation & auth

Requirements: R20, R21, R24, R25
Files: src/adapters/clock/SystemClock.ts, src/adapters/mail/DevOutboxMailer.ts, src/adapters/sqlite/authAdapters.ts, src/services/authService.ts
Ports: Clock, UserStore, TokenStore, SessionStore, Mailer
Tests: test/auth.test.ts, test/platform.test.ts
Commands: node --import tsx --test test/auth.test.ts, node --import tsx --test test/platform.test.ts, npm run lint, npm run typecheck
Parallel: yes
Out of scope: donations/devices/leases/families/classes adapters and services, routes, views, seed.ts
Goal: implement the magic-link auth flow (issue, verify, session lookup, logout) and its SQLite/dev-outbox/clock adapters exactly per the doc comments already in each stub file, so R21's role gate (already wired in src/http/middleware/requireRole.ts) and R24/R25 (already wired, just currently untested by anything that needs a session) all pass.

## T2: Donations

Requirements: R1, R2, R3, R4
Files: src/adapters/sqlite/SqliteDonationStore.ts, src/services/donationService.ts
Ports: DonationStore
Tests: test/donations.test.ts
Commands: node --import tsx --test test/donations.test.ts, npm run lint, npm run typecheck
Parallel: yes
Out of scope: auth, devices, leases, families, classes, routes, views, seed.ts
Goal: implement donation intake and the value-free acknowledgment letter exactly per DESIGN.md §3/§5 and the doc comments in SqliteDonationStore.ts/donationService.ts — R4 must hold because no price/value field is ever read, not because of a filter.

## T4: Leases & payments

Requirements: R9, R10, R11, R12, R13, R14, R15
Files: src/adapters/sqlite/leasePaymentAdapters.ts, src/services/leaseService.ts
Ports: LeaseStore, PaymentStore
Tests: test/leases.test.ts
Commands: node --import tsx --test test/leases.test.ts, npm run lint, npm run typecheck
Parallel: yes
Out of scope: auth, donations, devices, families, classes, routes, views, seed.ts — in particular, never write `devices.status` directly; always call the injected `DeviceLifecyclePort.transitionDevice`
Goal: implement lease creation, swap, custody chain, and the payment ledger/status/hardship-pause exactly per the doc comments in leasePaymentAdapters.ts and leaseService.ts — a device changes state only by going through the injected DeviceLifecyclePort, never by writing status directly, and "behind" is only ever a computed label, never an action.

## T3: Devices

Requirements: R5, R6, R7, R8
Files: src/adapters/sqlite/SqliteDeviceStore.ts, src/services/deviceService.ts
Ports: DeviceStore, DeviceLifecyclePort
Tests: test/devices.test.ts
Commands: node --import tsx --test test/devices.test.ts, npm run lint, npm run typecheck
Parallel: yes
Out of scope: auth, donations, leases, families, classes, routes, views, seed.ts
Goal: implement the device lifecycle store and the one guarded transition function exactly per DESIGN.md §4 (order of checks matters: NOT_FOUND, then INVALID_TRANSITION, then WIPE_FIELDS_REQUIRED on the way into `wiped`, then WIPE_REQUIRED on the way into `available` — this last check must run every time regardless of how the device reached its current status).

## T5: Families & classes

Requirements: R16, R17, R18, R19, R22
Files: src/adapters/sqlite/familyClassAdapters.ts, src/services/familyService.ts, src/services/classService.ts
Ports: FamilyStore, ClassStore
Tests: test/families.test.ts, test/classes.test.ts
Commands: node --import tsx --test test/families.test.ts, node --import tsx --test test/classes.test.ts, npm run lint, npm run typecheck
Parallel: yes
Out of scope: auth, donations, devices, leases, routes, views, seed.ts — in particular, never add a column or an accepted input field for SSN, bank details, or income to families
Goal: implement family CRUD/search, the one-screen family summary (device + wipe + payment status + attendance), and class session/roster/attendance exactly per the doc comments in familyClassAdapters.ts, familyService.ts, and classService.ts.

## T6: Seed data and final integration

Requirements: R23
Files: src/seed.ts, README.md, src/server.ts, src/http/routes/api.ts, src/http/routes/auth.ts, src/http/routes/classes.ts, src/http/routes/devices.ts, src/http/routes/donations.ts, src/http/routes/families.ts, src/http/routes/leases.ts, views/classes/detail.ejs, views/classes/list.ejs, views/dashboard.ejs, views/devices/detail.ejs, views/devices/list.ejs, views/donations/acknowledgment.ejs, views/donations/detail.ejs, views/donations/list.ejs, views/errors/forbidden.ejs, views/errors/generic.ejs, views/families/detail.ejs, views/families/list.ejs, views/leases/detail.ejs, views/leases/list.ejs, views/login.ejs, views/partials/nav.ejs
Ports: (none new — composes the services T1–T5 already implemented)
Tests: test/seed.test.ts, plus the full suite (all of test/*.test.ts and test/e2e/*.spec.ts)
Commands: node --import tsx --test test/seed.test.ts, npm test, npm run lint, npm run typecheck, npm run build
Parallel: no
Out of scope: any adapter or service file — T1-T5 own those, and a failing view test is never a reason to change domain logic. This task owns the web layer (server, routes, views) that the six Playwright specs drive, and fills in src/seed.ts (per its doc comment's exact literals — serial prefix `SN-SEED-`, family names `Herrera Family` / `Osei Family` — several tests depend on them verbatim) and finishes README.md's install/run/seed/test instructions to match what actually ships
Goal: make `npm run seed` populate the exact demo dataset R23 requires (one donation with 5 items, 4+ distinct device lifecycle stages, 2 leases, 1 visible swap), and get the entire test suite — unit, adapter, route, and the six Playwright workflow specs — green from a fresh clone.

```json tasks
{ "tasks": [
    { "id": "T1", "title": "Foundation & auth", "requirements": ["R20", "R21", "R24", "R25"], "files": ["src/adapters/clock/SystemClock.ts", "src/adapters/mail/DevOutboxMailer.ts", "src/adapters/sqlite/authAdapters.ts", "src/services/authService.ts"], "ports": ["Clock", "UserStore", "TokenStore", "SessionStore", "Mailer"], "tests": ["test/auth.test.ts", "test/platform.test.ts"], "commands": ["node --import tsx --test test/auth.test.ts", "node --import tsx --test test/platform.test.ts", "npm run lint", "npm run typecheck"], "parallel_ok": true },
    { "id": "T2", "title": "Donations", "requirements": ["R1", "R2", "R3", "R4"], "files": ["src/adapters/sqlite/SqliteDonationStore.ts", "src/services/donationService.ts"], "ports": ["DonationStore"], "tests": ["test/donations.test.ts"], "commands": ["node --import tsx --test test/donations.test.ts", "npm run lint", "npm run typecheck"], "parallel_ok": true },
    { "id": "T3", "title": "Devices", "requirements": ["R5", "R6", "R7", "R8"], "files": ["src/adapters/sqlite/SqliteDeviceStore.ts", "src/services/deviceService.ts"], "ports": ["DeviceStore", "DeviceLifecyclePort"], "tests": ["test/devices.test.ts"], "commands": ["node --import tsx --test test/devices.test.ts", "npm run lint", "npm run typecheck"], "parallel_ok": true },
    { "id": "T4", "title": "Leases & payments", "requirements": ["R9", "R10", "R11", "R12", "R13", "R14", "R15"], "files": ["src/adapters/sqlite/leasePaymentAdapters.ts", "src/services/leaseService.ts"], "ports": ["LeaseStore", "PaymentStore"], "tests": ["test/leases.test.ts"], "commands": ["node --import tsx --test test/leases.test.ts", "npm run lint", "npm run typecheck"], "parallel_ok": true },
    { "id": "T5", "title": "Families & classes", "requirements": ["R16", "R17", "R18", "R19", "R22"], "files": ["src/adapters/sqlite/familyClassAdapters.ts", "src/services/familyService.ts", "src/services/classService.ts"], "ports": ["FamilyStore", "ClassStore"], "tests": ["test/families.test.ts", "test/classes.test.ts"], "commands": ["node --import tsx --test test/families.test.ts", "node --import tsx --test test/classes.test.ts", "npm run lint", "npm run typecheck"], "parallel_ok": true },
    { "id": "T6", "title": "Seed data and final integration", "requirements": ["R23"], "files": ["src/seed.ts", "README.md"], "ports": [], "tests": ["test/seed.test.ts"], "commands": ["node --import tsx --test test/seed.test.ts", "npm test", "npm run lint", "npm run typecheck", "npm run build"], "parallel_ok": false }
  ] }
```
