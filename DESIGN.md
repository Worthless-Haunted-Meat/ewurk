# EWURK — Design

Build job. Stack per `REQUIREMENTS.md` Decisions: Node.js (>=22.5) +
TypeScript (ESM, `NodeNext` module resolution — **every relative import
uses an explicit `.js` extension**, even though the source file is `.ts`;
this is required by `NodeNext` and is not optional), Express,
server-rendered EJS views, Node's built-in `node:sqlite` (`DatabaseSync` —
no native addon, no compile step), `node:test` for unit/route/adapter
tests, Playwright Test for browser flows, `tsx` to run TypeScript directly
for `dev`/`seed`/e2e fixtures without a separate build step.

## 0. What is real code now vs. a stub

To keep the blueprint buildable in a bounded number of tasks, this commit
draws a firm line:

- **Written in full now (not a stub):** config/tooling, `src/db/*`,
  `src/domain/*` (pure, no I/O), `src/ports/*` (interfaces only, no
  runtime body to stub), `src/http/errors.ts`, `src/http/asyncHandler.ts`,
  `src/http/middleware/*`, `src/http/routes/*` (thin controllers: parse
  input, call one service method, render/respond — no business rules),
  `views/*` (presentation only — inert until the service behind them stops
  throwing), `src/app.ts`, `src/server.ts`, `public/style.css`.
  None of these decide any requirement's outcome; they wire the ports
  together and render whatever a service returns.
- **Stubbed now, real logic added by a task:** every file under
  `src/adapters/**` and `src/services/**`, and `src/seed.ts`. Every
  exported function/method throws `new Error('not implemented: <Name>')`.
  This is where every invariant (R4, R6, R15, R22) is actually enforced.

Because routes call services that throw, and the global error middleware
(§3) turns any non-`AppError` into a 500, the app **runs** at this commit
(`npm start` answers `GET /` with 200 — the login page renders with no
service calls) but every real workflow fails loudly. `npm test` fails.

## 1. Layout

Config/tooling (repo root):
- `package.json` — scripts, deps. See §7.
- `tsconfig.json` — strict, `NodeNext`.
- `eslint.config.js` — flat config, `typescript-eslint` recommended.
- `playwright.config.ts` — `testDir: './test/e2e'`, starts the built app.
- `.gitignore` — updated with `QUALITY.md`'s hygiene list.
- `README.md` — install/run/test/seed commands.
- `LICENSE` — GPL-3.0 full text.

`src/db/`
- `schema.sql` — DDL, exports nothing (read as text).
- `connection.ts` — `openDb(path: string): DatabaseSync` (`DatabaseSync`
  from `node:sqlite`). Opens the db, applies `schema.sql` via `migrate`,
  returns the handle. Not called at import time.
- `migrate.ts` — `migrate(db: DatabaseSync): void`. Runs `schema.sql`.

`src/domain/`
- `types.ts` — every entity/DTO type and `DeviceStatus`, `Role`, etc.
- `deviceLifecycle.ts` — `NEXT_STATUSES`, `canTransition(from,to)`,
  `nextStatuses(from)`, `WIPE_FIELDS: readonly ['wipeMethod','wipeDate','wipeOperator']`.
  Pure, fully implemented now (§4).
- `money.ts` — `MONTHLY_CENTS = 2000`, `dollarsToCents`, `centsToDisplay`,
  `monthsCovered(totalCents)`. Pure.

`src/ports/` (interfaces only)
- `auth.ts` — `UserStore`, `TokenStore`, `SessionStore`, `Mailer`, `OutboxEntry`.
- `donation.ts` — `DonationStore`.
- `device.ts` — `DeviceStore`, `DeviceLifecyclePort` (narrow port).
- `lease.ts` — `LeaseStore`, `PaymentStore`.
- `family.ts` — `FamilyStore`.
- `classPort.ts` — `ClassStore`.
- `clock.ts` — `Clock`.

`src/deps.ts` — `AppDeps` interface (every port + every service +
`devOutboxEnabled: boolean`). The one composition-root dependency bag;
`src/http/**` never imports a concrete adapter class, only this type.

`src/http/`
- `errors.ts` — `AppError`, `ErrorCode`, `errorEnvelope`, `errorMessageForCode`.
- `asyncHandler.ts` — wraps async Express handlers.
- `middleware/session.ts` — `sessionMiddleware(deps): RequestHandler`, `SESSION_COOKIE_NAME`.
- `middleware/requireRole.ts` — `requireRole(...roles): RequestHandler` (web:
  redirect `/login` / render `errors/forbidden`) and `requireRoleApi(...roles): RequestHandler`
  (api: 401/403 JSON envelope). **Each resource gets two separate `Router()`
  instances, one web and one api** (see below) — this is what lets each
  router pick the matching gate function instead of sniffing the path.
- `routes/auth.ts` — `authWebRouter(deps): Router`.
- `routes/donations.ts` — `donationsWebRouter(deps): Router`, `donationsApiRouter(deps): Router`.
- `routes/devices.ts` — `devicesWebRouter(deps): Router`, `devicesApiRouter(deps): Router`.
  The web list view additionally enriches each device with `donorOrg`
  (via `deps.donations.getById(device.donationId)`) and `holder` (the
  active lease's family name, found by scanning `deps.leases.listAll()`
  for the lease whose current custody device matches, else `"in stock"`)
  — this is what makes R8's donor/holder display possible; the API list
  stays the raw `Device[]` shape.
- `routes/leases.ts` — `leasesWebRouter(deps): Router`, `leasesApiRouter(deps): Router`.
- `routes/families.ts` — `familiesWebRouter(deps): Router`, `familiesApiRouter(deps): Router`.
- `routes/classes.ts` — `classesWebRouter(deps): Router`, `classesApiRouter(deps): Router`.
- `routes/api.ts` — `apiIndexRouter(deps): Router` (mounts `GET /api`
  only — the static endpoint list; the `/api/*` 404 fallback is mounted
  directly in `app.ts` after every api router, per §7).

`app.ts` mounts each pair as: `app.use('/donations', donationsWebRouter(deps))`
and `app.use('/api/donations', donationsApiRouter(deps))` (and so on for
every resource) — each router's internal paths are written relative to
that single mount point (e.g. `router.get('/', ...)`, `router.get('/:id', ...)`),
never repeating the `/donations` or `/api/donations` prefix inside the
router file itself.

`src/types/express.d.ts` — augments `Request.user?: User | null`.

`src/app.ts` — `createApp(deps: AppDeps): Express`.
`src/server.ts` — composition root: builds real adapters/services, calls
`createApp`, listens on `process.env.PORT ?? 3000`.
`src/seed.ts` — stub now; T6 fills it in. Signature:
`seed(deps: AppDeps, db: DatabaseSync): void` (the raw `db` handle is
for seeding `users` directly — there is no "create user" use case in v1),
plus a `main()` that calls `buildDeps()` from `src/server.ts` (which
returns `{deps, db}` against `process.env.EWURK_DB_PATH ?? 'data/ewurk.db'`)
and calls `seed(deps, db)`.

`src/adapters/sqlite/` (stubs)
- `authAdapters.ts` — `SqliteUserStore`, `SqliteTokenStore`, `SqliteSessionStore`.
- `SqliteDonationStore.ts` — `SqliteDonationStore`.
- `SqliteDeviceStore.ts` — `SqliteDeviceStore`.
- `leasePaymentAdapters.ts` — `SqliteLeaseStore`, `SqlitePaymentStore`.
- `familyClassAdapters.ts` — `SqliteFamilyStore`, `SqliteClassStore`.

`src/adapters/mail/DevOutboxMailer.ts` (stub) — `DevOutboxMailer` (implements
`Mailer`, in-memory list, no real email ever sent).
`src/adapters/clock/SystemClock.ts` (stub) — `SystemClock` (implements `Clock`).

`src/services/` (stubs)
- `authService.ts` — `AuthService`.
- `donationService.ts` — `DonationService`.
- `deviceService.ts` — `DeviceService`.
- `leaseService.ts` — `LeaseService`, `PaymentService`.
- `familyService.ts` — `FamilyService`.
- `classService.ts` — `ClassService`.

`views/` — EJS, written in full now:
`partials/nav.ejs`, `login.ejs`, `dashboard.ejs`, `errors/forbidden.ejs`,
`errors/generic.ejs`, `donations/list.ejs`, `donations/detail.ejs`,
`donations/acknowledgment.ejs`, `devices/list.ejs`, `devices/detail.ejs`,
`families/list.ejs`, `families/detail.ejs`, `leases/list.ejs`,
`leases/detail.ejs`, `classes/list.ejs`, `classes/detail.ejs`.

`public/style.css` — mobile-first, single column, large tap targets.

Tests (§6, written in full now, red): `test/domain.test.ts`,
`test/platform.test.ts`, `test/auth.test.ts`, `test/donations.test.ts`,
`test/devices.test.ts`, `test/leases.test.ts`, `test/classes.test.ts`,
`test/families.test.ts`, `test/seed.test.ts`, `test/helpers/testApp.ts`
(shared fake-store builder + tiny HTTP client, not itself a test file),
`test/e2e/w1.donation-intake.spec.ts`, `test/e2e/w2.device-lifecycle.spec.ts`,
`test/e2e/w3.lease-lifecycle.spec.ts`, `test/e2e/w4.serial-lookup.spec.ts`,
`test/e2e/w5.role-boundaries.spec.ts`, `test/e2e/w6.fresh-clone.spec.ts`.

## 2. Data model

SQLite, see `src/db/schema.sql` for exact DDL (written in full in that
file). Summary (all dates/timestamps are ISO `YYYY-MM-DD` or full ISO
datetime strings, all money is integer cents):

- `users(id, email UNIQUE, name, role CHECK IN staff/volunteer/instructor, created_at)`
  — **no password column, ever.**
- `magic_links(id, user_id, token_hash UNIQUE, expires_at, used_at, created_at)`
- `sessions(id TEXT PK, user_id, expires_at, created_at)`
- `donations(id, donor_org, pickup_date, status CHECK IN scheduled/received/acknowledged, created_at)`
- `devices(id, asset_tag UNIQUE, donation_id, model, serial, status CHECK IN
  received/triaged/wiped/refurbished/imaged/available/leased/returned/repair/retired,
  wipe_method, wipe_date, wipe_operator, replaces_device_id, replaced_by_device_id, created_at)`
  — **no value/price/cost column, ever** (this is what makes R4 hold by
  construction: there is nothing to print).
- `device_events(id, device_id, event_type, actor, note, created_at)`
- `families(id, name, contact, neighborhood, created_at)` — **no ssn, no
  bank_account, no income column, ever** (R22 holds by construction).
- `leases(id, family_id, start_date, status CHECK IN active/ended,
  hardship_paused INTEGER 0/1, created_at)`
- `lease_devices(id, lease_id, device_id, started_at, ended_at)` — the
  custody chain; the row with `ended_at IS NULL` is the lease's current
  device.
- `payments(id, lease_id, amount_cents, paid_date, created_at)`
- `class_sessions(id, session_date, topic, created_at)`
- `attendance(id, session_id, family_id, present INTEGER 0/1, UNIQUE(session_id, family_id))`

## 3. Ports

Each service constructor takes only the ports it calls (interface
segregation). Full TypeScript below — this is the exact contract every
adapter and service stub must satisfy.

```ts
// src/ports/clock.ts
export interface Clock {
  now(): Date;
  todayISO(): string; // 'YYYY-MM-DD'
}
```

```ts
// src/ports/auth.ts
import type { User, Role } from '../domain/types.js';

export interface UserStore {
  findByEmail(email: string): User | null;
  getById(id: number): User | null;
  list(): User[];
}

export interface TokenStore {
  issue(userId: number, tokenHash: string, expiresAt: string): void;
  /** Marks the token used and returns the user id, or null if missing/expired/already used. */
  consume(tokenHash: string): number | null;
}

export interface SessionStore {
  create(userId: number, expiresAt: string): string; // returns sessionId
  get(sessionId: string): { userId: number; expiresAt: string } | null;
  destroy(sessionId: string): void;
}

export interface OutboxEntry {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface Mailer {
  send(to: string, subject: string, body: string): void;
  list(): OutboxEntry[];
}

export type { Role };
```

```ts
// src/ports/donation.ts
import type { Donation, DonationStatus } from '../domain/types.js';

export interface DonationStore {
  create(input: { donorOrg: string; pickupDate: string }): Donation;
  getById(id: number): Donation | null;
  list(): Donation[];
  updateStatus(id: number, status: DonationStatus): Donation;
}
```

```ts
// src/ports/device.ts
import type { Device, DeviceEvent, DeviceStatus } from '../domain/types.js';

export interface WipeInput {
  wipeMethod: string;
  wipeDate: string;
  wipeOperator: string;
}

/** Full store, implemented by SqliteDeviceStore and consumed by DeviceService. */
export interface DeviceStore {
  create(input: { donationId: number; model: string; serial: string }): Device;
  getById(id: number): Device | null;
  getByAssetTag(assetTag: string): Device | null;
  findBySerial(serial: string): Device | null;
  listByDonation(donationId: number): Device[];
  listAll(): Device[];
  updateStatus(id: number, status: DeviceStatus, wipe?: WipeInput): Device;
  setReplacesLink(deviceId: number, replacesDeviceId: number): void;
  appendEvent(deviceId: number, eventType: string, actor: string, note?: string): DeviceEvent;
  listEvents(deviceId: number): DeviceEvent[];
}

/**
 * Narrow port for consumers (LeaseService) that only need to read a device
 * and drive it through the guarded transition — never a raw status write.
 */
export interface DeviceLifecyclePort {
  getById(deviceId: number): Device | null;
  getByAssetTag(assetTag: string): Device | null;
  transitionDevice(
    deviceId: number,
    to: DeviceStatus,
    actor: string,
    payload?: Partial<WipeInput>,
  ): Device;
  /** Records a replaces/replaced-by link (not a status change). */
  setReplacesLink(deviceId: number, replacesDeviceId: number): void;
}
```

```ts
// src/ports/lease.ts
import type { Lease, LeaseDevice, Payment } from '../domain/types.js';

export interface LeaseStore {
  create(input: { familyId: number; startDate: string }): Lease;
  getById(id: number): Lease | null;
  findActiveByFamily(familyId: number): Lease | null;
  listByFamily(familyId: number): Lease[];
  listAll(): Lease[];
  setHardshipPaused(id: number, paused: boolean): Lease;
  addCustody(leaseId: number, deviceId: number, startedAt: string): LeaseDevice;
  endCustody(leaseId: number, deviceId: number, endedAt: string): LeaseDevice;
  listCustody(leaseId: number): LeaseDevice[];
  getCurrentDeviceId(leaseId: number): number | null;
}

export interface PaymentStore {
  record(input: { leaseId: number; amountCents: number; paidDate: string }): Payment;
  listByLease(leaseId: number): Payment[];
}
```

```ts
// src/ports/family.ts
import type { Family } from '../domain/types.js';

export interface FamilyStore {
  create(input: { name: string; contact: string; neighborhood?: string }): Family;
  getById(id: number): Family | null;
  search(nameQuery: string): Family[];
  list(): Family[];
}
```

```ts
// src/ports/classPort.ts
import type { ClassSession, AttendanceRecord } from '../domain/types.js';

export interface ClassStore {
  createSession(input: { sessionDate: string; topic: string }): ClassSession;
  getSession(id: number): ClassSession | null;
  listSessions(): ClassSession[];
  upsertAttendance(sessionId: number, familyId: number, present: boolean): AttendanceRecord;
  listAttendance(sessionId: number): AttendanceRecord[];
  listAttendanceByFamily(
    familyId: number,
  ): Array<AttendanceRecord & { sessionDate: string; topic: string }>;
}
```

### Services (consumers, exact constructor signatures)

```ts
class AuthService {
  constructor(
    private users: UserStore,
    private tokens: TokenStore,
    private sessions: SessionStore,
    private mailer: Mailer,
    private clock: Clock,
  ) {}
  requestMagicLink(email: string): void; // no-op (silently) if email unknown; never throws for unknown email
  verifyMagicLink(rawToken: string): { sessionId: string; user: User }; // throws AppError('INVALID_TOKEN')
  getSessionUser(sessionId: string): User | null;
  logout(sessionId: string): void;
}

class DonationService {
  constructor(
    private donations: DonationStore,
    private deviceCreation: Pick<DeviceStore, 'create' | 'appendEvent' | 'listByDonation'>,
    private clock: Clock,
  ) {}
  createDonation(input: { donorOrg: string; pickupDate: string }): Donation;
  receiveItem(donationId: number, input: { model: string; serial: string }, actor: string): Device; // throws NOT_FOUND
  generateAcknowledgment(donationId: number): {
    donorOrg: string; pickupDate: string; items: Array<{ model: string; assetTag: string }>; acknowledgedAt: string;
  }; // throws NOT_FOUND, throws AppError('NO_ITEMS') if zero items
}

class DeviceService implements DeviceLifecyclePort {
  constructor(private devices: DeviceStore, private clock: Clock) {}
  getById(deviceId: number): Device | null;
  getByAssetTag(assetTag: string): Device | null;
  transitionDevice(deviceId: number, to: DeviceStatus, actor: string, payload?: Partial<WipeInput>): Device;
  // throws NOT_FOUND, INVALID_TRANSITION, WIPE_FIELDS_REQUIRED (to==='wiped', missing field),
  // WIPE_REQUIRED (to==='available', device lacks wipeMethod/wipeDate/wipeOperator)
  getTimeline(deviceId: number): { device: Device; events: DeviceEvent[] }; // throws NOT_FOUND
  searchBySerial(serial: string): Device | null;
}

class LeaseService {
  constructor(
    private leases: LeaseStore,
    private deviceLifecycle: DeviceLifecyclePort,
    private families: FamilyStore,
    private clock: Clock,
  ) {}
  createLease(familyId: number, assetTag: string, actor: string): Lease;
  // throws NOT_FOUND (family or device), DUPLICATE_ACTIVE_LEASE, DEVICE_NOT_AVAILABLE
  // (DEVICE_NOT_AVAILABLE wraps the underlying INVALID_TRANSITION from transitionDevice(...,'leased',...))
  swap(leaseId: number, newAssetTag: string, actor: string): Lease; // throws NOT_FOUND, DEVICE_NOT_AVAILABLE
  getCustodyChain(leaseId: number): Array<LeaseDevice & { assetTag: string }>;
  getFamilyLeases(familyId: number): Lease[];
  getCurrentDevice(leaseId: number): Device | null;
}

class PaymentService {
  constructor(private payments: PaymentStore, private leases: LeaseStore, private clock: Clock) {}
  recordPayment(leaseId: number, amountCents: number, paidDate: string): Payment; // throws NOT_FOUND, VALIDATION (amountCents<=0)
  getStatus(leaseId: number): { status: 'current' | 'behind' | 'paused'; paidThroughDate: string; totalPaidCents: number };
  setHardshipPause(leaseId: number, paused: boolean): Lease; // throws NOT_FOUND
}

class FamilyService {
  constructor(
    private families: FamilyStore,
    private leases: LeaseStore,
    private deviceLifecycle: DeviceLifecyclePort,
    private payments: PaymentService,
    private classes: ClassStore,
    private clock: Clock,
  ) {}
  createFamily(input: { name: string; contact: string; neighborhood?: string }): Family;
  search(query: string): Family[];
  getSummary(familyId: number): FamilySummary; // throws NOT_FOUND; see domain/types.ts
}

class ClassService {
  constructor(private classes: ClassStore, private leases: LeaseStore, private families: FamilyStore) {}
  createSession(sessionDate: string, topic: string): ClassSession;
  buildRoster(sessionId: number): Family[]; // throws NOT_FOUND; upserts attendance(present:false) for every family with an active lease
  markAttendance(sessionId: number, familyId: number, present: boolean): AttendanceRecord; // throws NOT_FOUND
  listSessions(): ClassSession[];
  getSession(id: number): ClassSession | null;
}
```

`FamilySummary` (in `domain/types.ts`):
```ts
export interface FamilySummary {
  family: Family;
  activeLease: Lease | null;
  currentDevice: Device | null;
  paymentStatus: { status: 'current' | 'behind' | 'paused'; paidThroughDate: string } | null;
  attendance: Array<{ sessionDate: string; topic: string; present: boolean }>;
}
```

## 4. Device lifecycle (pure, `src/domain/deviceLifecycle.ts`, written in full now)

```ts
import type { DeviceStatus } from './types.js';

export const NEXT_STATUSES: Record<DeviceStatus, DeviceStatus[]> = {
  received: ['triaged'],
  triaged: ['wiped', 'retired'],
  wiped: ['refurbished'],
  refurbished: ['imaged', 'retired'],
  imaged: ['available'],
  available: ['leased'],
  leased: ['returned', 'repair'],
  returned: ['triaged', 'retired'],
  repair: ['refurbished', 'retired'],
  retired: [],
};

export function nextStatuses(from: DeviceStatus): DeviceStatus[] {
  return NEXT_STATUSES[from];
}

export function canTransition(from: DeviceStatus, to: DeviceStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

export const WIPE_FIELDS = ['wipeMethod', 'wipeDate', 'wipeOperator'] as const;
```

`DeviceService.transitionDevice` (implemented by T3) must, in order:
1. Load the device; throw `NOT_FOUND` if missing.
2. `if (!canTransition(device.status, to)) throw new AppError('INVALID_TRANSITION', ...)`.
3. `if (to === 'wiped')`: require `payload.wipeMethod && payload.wipeDate && payload.wipeOperator`,
   else throw `WIPE_FIELDS_REQUIRED`.
4. `if (to === 'available')`: require the device's **current** `wipeMethod`,
   `wipeDate`, `wipeOperator` (persisted at step 3, on an earlier call) to
   all be non-null, else throw `WIPE_REQUIRED`. This check is independent
   of step 2's sequencing — it runs even though only `imaged` devices can
   reach `available` today, so the gate still holds if the graph above is
   ever loosened later. Tests prove this directly by seeding a device row
   at `status='imaged'` with null wipe fields (bypassing the service) and
   asserting `WIPE_REQUIRED`.
5. Call `devices.updateStatus(id, to, wipe)`, then `devices.appendEvent(id, to, actor)`.
6. Return the updated device.

`transitionDevice` is the **only** place any code may change `devices.status`.
`LeaseService.swap`/`createLease` call it too (never `DeviceStore.updateStatus`
directly), which is why `LeaseService` depends on `DeviceLifecyclePort`, not
`DeviceStore`.

## 5. API contract

Single error envelope, always: `{"error":{"code":"<ErrorCode>","message":"<string>"}}`.
Status codes: `NOT_FOUND`→404, `INVALID_TRANSITION`→409, `WIPE_REQUIRED`→409,
`WIPE_FIELDS_REQUIRED`→400, `DUPLICATE_ACTIVE_LEASE`→409,
`DEVICE_NOT_AVAILABLE`→409, `NO_ITEMS`→422, `VALIDATION`→400,
`UNAUTHENTICATED`→401, `FORBIDDEN`→403, `INVALID_TOKEN`→401, `INTERNAL`→500.
Any path under `/api` that matches no route → 404 with code `NOT_FOUND`.

Web (HTML) routes render EJS on success. **Every** failure (GET or POST) —
any thrown `AppError`, or the "not implemented" error a stub throws —
propagates via `asyncHandler` to `app.ts`'s single error-handling
middleware (§7), which renders `views/errors/generic.ejs` with the right
HTTP status and `errorEnvelope(err).body.error.message`, inside
`<div role="alert">`. Routes never catch `AppError` themselves and never
build their own error page. (`GET /login?sent=1` after
`POST /auth/magic-link` is the one deliberate exception, used only to show
"check the outbox" — not an error.)

| Method & path | Role | Body | Success |
|---|---|---|---|
| `GET /` | public | — | 200, login or dashboard |
| `GET /login` | public | — | 200 |
| `POST /auth/magic-link` | public | `{email}` | 302 → `/login?sent=1` |
| `GET /auth/verify?token=` | public | — | 302 → `/` (sets `ewurk_session` cookie, httpOnly, path=/) |
| `POST /auth/logout` | any | — | 302 → `/login` |
| `GET /dev/outbox` | public, dev-only | — | 200 JSON `OutboxEntry[]`; 404 JSON if disabled |
| `GET /donations` | staff,volunteer | — | 200 |
| `POST /donations` | staff,volunteer | `{donorOrg,pickupDate}` | 302 → `/donations/:id` |
| `GET /donations/:id` | staff,volunteer | — | 200 |
| `POST /donations/:id/items` | staff,volunteer | `{model,serial}` | 302 → `/donations/:id` |
| `GET /donations/:id/acknowledgment` | staff,volunteer | — | 200 |
| `GET /devices` | staff,volunteer | `?serial=` | 200 |
| `GET /devices/:assetTag` | staff,volunteer | — | 200 |
| `POST /devices/:assetTag/transition` | staff,volunteer | `{to,wipeMethod?,wipeDate?,wipeOperator?}` | 302 → `/devices/:assetTag` |
| `GET /leases` | staff | — | 200 |
| `GET /leases/:id` | staff | — | 200 |
| `POST /leases` | staff | `{familyId,assetTag}` | 302 → `/families/:familyId` |
| `POST /leases/:id/swap` | staff | `{newAssetTag}` | 302 → `/leases/:id` |
| `POST /leases/:id/payments` | staff | `{amountDollars,paidDate}` | 302 → `/leases/:id` |
| `POST /leases/:id/hardship-pause` | staff | `{paused}` | 302 → `/leases/:id` |
| `GET /families` | staff | `?q=` | 200 |
| `POST /families` | staff | `{name,contact,neighborhood?}` | 302 → `/families/:id` |
| `GET /families/:id` | staff | — | 200 |
| `GET /classes` | staff,instructor | — | 200 |
| `POST /classes` | staff,instructor | `{sessionDate,topic}` | 302 → `/classes/:id` |
| `GET /classes/:id` | staff,instructor | — | 200 |
| `POST /classes/:id/roster` | staff,instructor | — | 302 → `/classes/:id` |
| `POST /classes/:id/attendance` | staff,instructor | `{familyId,present}` | 302 → `/classes/:id` |
| `GET /api` | public | — | 200 JSON `{name,version,endpoints:[...]}` (static list, no verbs like lock/disable/brick) |
| `GET /api/donations` / `/api/donations/:id` | staff,volunteer | — | 200 JSON |
| `POST /api/donations` / `POST /api/donations/:id/items` | staff,volunteer | JSON body | 201/200 JSON |
| `GET /api/donations/:id/acknowledgment` | staff,volunteer | — | 200 JSON `{donorOrg,pickupDate,items,text}` |
| `GET /api/devices` (`?serial=`) / `/api/devices/:assetTag` | staff,volunteer | — | 200 JSON |
| `POST /api/devices/:assetTag/transition` | staff,volunteer | JSON body | 200 JSON device |
| `GET /api/leases` / `/api/leases/:id` | staff | — | 200 JSON |
| `POST /api/leases` / `/swap` / `/payments` / `/hardship-pause` | staff | JSON body | 200/201 JSON |
| `GET /api/families` (`?q=`) | staff | — | 200 JSON `Family[]` |
| `GET /api/families/:id` | staff | — | 200 JSON `FamilySummary` (R19 — same shape as the one-screen view: `{family, activeLease, currentDevice, paymentStatus, attendance}`) |
| `POST /api/families` | staff | JSON body | 201 JSON |
| `GET /api/classes` / `/api/classes/:id` | staff,instructor | — | 200 JSON |
| `POST /api/classes` / `/roster` / `/attendance` | staff,instructor | JSON body | 200/201 JSON |
| anything else under `/api` | — | — | 404 JSON `NOT_FOUND` |

`GET /api/donations/:id/acknowledgment`'s `text` field is the exact letter
body: donor org, pickup date, IRS boilerplate ("No goods or services were
provided in exchange for this donation."), and one line per item
(`model — asset tag`). It is built by string concatenation from fields
that never include money — see §2. `donationService.generateAcknowledgment`
must not accept, read, or reference any cents/price/value field; there is
none in scope, structurally.

## 6. Tests, red (see file list in §1)

Every file under `test/*.test.ts` uses Node's built-in `node:test` +
`node:assert/strict`, imports the real `AppError`/domain/service/adapter
modules, and is organized as three `describe` blocks per bounded context:
`'service (fake ports)'` (hand-rolled in-memory fakes implementing the
port interfaces from §3), `'sqlite adapter (real, :memory:)'` (opens
`openDb(':memory:')`, exercises the real `Sqlite*Store` classes), and
`'routes (wired app, fakes)'` (builds `createApp(deps)` with fakes for
every port, using `test/helpers/testApp.ts`'s `startTestServer(deps)` which
listens on an ephemeral port and returns `{ baseUrl, close() }`, then uses
global `fetch`). Every `test()`/`it()` name is prefixed with its
requirement id, e.g. `test('[R6] available is refused without a wipe record', ...)`.

`test/helpers/testApp.ts` exports `buildFakeDeps(): FakeBag` (`{...every
fake port, deps: AppDeps}`, built from real service classes over in-memory
fakes) and `startTestServer(deps): Promise<TestServer>`. Two deliberate
exceptions to "every service is the real class": `FakeBag.deps.leaseService`/
`familyService` are wired against a `FakeDeviceLifecycle` test double (not
the real, still-stub `DeviceService`), and `FakeBag.deps.authService` is a
`FakeAuthService` test double implementing `AuthServicePort` (not the
real, still-stub `AuthService`) — because `sessionMiddleware` calls
`authService.getSessionUser` on **every** request, so route tests for
every other bounded context would 500 before their own logic ever ran
otherwise. `FakeBag.deps.deviceService` stays the real `DeviceService`
(device routes exist to test it) and `AuthService` itself is tested
directly in `test/auth.test.ts` — only the wiring used by *other*
contexts' route tests is faked. This file is test infrastructure, not a
test itself, and is written in full now (real code) since every test file
needs it identically.

Playwright specs live in `test/e2e/*.spec.ts`, one per workflow (`W1`..`W6`),
each `test()` tagged `[Rn]` for the requirements it exercises within that
workflow, per `playwright.config.ts`'s `webServer` (§7) which builds and
serves the **real** app against a fresh seeded SQLite file on port 4310.
They act via `getByRole`/`getByLabel` and assert on visible text, per the
job's browser-check rule.

## 7. Wiring, tooling, commands

`createApp(deps: AppDeps)` in `src/app.ts`:
```ts
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware(deps));
  app.get('/', (req, res) => res.render(req.user ? 'dashboard' : 'login', { user: req.user ?? null }));
  app.get('/login', (req, res) => res.render('login', { user: req.user ?? null }));
  app.use('/auth', authWebRouter(deps));
  if (deps.devOutboxEnabled) {
    app.get('/dev/outbox', (_req, res) => res.json(deps.mailer.list()));
  } else {
    app.get('/dev/outbox', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));
  }
  app.use('/donations', donationsWebRouter(deps));
  app.use('/devices', devicesWebRouter(deps));
  app.use('/leases', leasesWebRouter(deps));
  app.use('/families', familiesWebRouter(deps));
  app.use('/classes', classesWebRouter(deps));
  app.use('/api', apiIndexRouter(deps));
  app.use('/api/donations', donationsApiRouter(deps));
  app.use('/api/devices', devicesApiRouter(deps));
  app.use('/api/leases', leasesApiRouter(deps));
  app.use('/api/families', familiesApiRouter(deps));
  app.use('/api/classes', classesApiRouter(deps));
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such API endpoint.' } }));
  app.use((req, res) => res.status(404).render('errors/generic', { status: 404, message: 'Not found.', user: req.user ?? null }));
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const { status, body } = errorEnvelope(err);
    if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) res.status(status).json(body);
    else res.status(status).render('errors/generic', { status, message: body.error.message, user: req.user ?? null });
  });
  return app;
}
```
Each resource file (e.g. `routes/donations.ts`) exports two independent
`Router()` builders — `donationsWebRouter(deps)` (mounted at `/donations`,
uses `requireRole`, renders EJS, redirects on success/error) and
`donationsApiRouter(deps)` (mounted at `/api/donations`, uses
`requireRoleApi`, returns JSON always). Both call the **same** service
methods; only request parsing and response shape differ between them. Do
not share one `Router()` instance across both mount points.

`src/server.ts`: builds `SystemClock`, opens the real DB at
`process.env.EWURK_DB_PATH ?? 'data/ewurk.db'`, builds every real adapter
and service, sets `devOutboxEnabled = process.env.NODE_ENV !== 'production'`,
calls `createApp(deps)`, `app.listen(process.env.PORT ?? 3000)`. No module
above this one opens a DB, reads `process.env`, or calls `listen` at import
time.

### package.json (scripts — exact)
```json
{
  "name": "ewurk",
  "version": "0.1.0",
  "private": true,
  "license": "GPL-3.0-or-later",
  "type": "module",
  "engines": { "node": ">=22.5.0" },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json && node -e \"require('fs').mkdirSync('dist/db',{recursive:true});require('fs').copyFileSync('src/db/schema.sql','dist/db/schema.sql')\"",
    "start": "node dist/server.js",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "seed": "tsx src/seed.ts",
    "test:unit": "node --import tsx --test test/*.test.ts",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:e2e",
    "test:e2e:reset": "node -e \"try{require('fs').unlinkSync('data/test.db')}catch(e){}\"",
    "test:e2e:seed": "EWURK_DB_PATH=data/test.db tsx src/seed.ts",
    "test:e2e:serve": "EWURK_DB_PATH=data/test.db PORT=4310 node dist/server.js"
  }
}
```
(Dependencies are already present as of this commit — see `package.json`:
`express`, `ejs`; dev: `typescript`, `tsx`, `eslint`, `@eslint/js`,
`typescript-eslint`, `@types/express`, `@types/node`, `@playwright/test`.
No SQLite package: storage uses Node's built-in `node:sqlite`, whose types
ship inside `@types/node`.)

### Quality bar (from `QUALITY.md`, unchanged)
| install | `npm ci && npx playwright install chromium` |
| lint | `npm run lint` |
| typecheck | `npm run typecheck` |
| test | `npm test` |
| build | `npm run build` |
| start | `npm start`, probe `GET /` expect 200 |

## Must not change

- No `value`/`price`/`cost` field is ever added to `donations`, `devices`,
  or the acknowledgment text/JSON.
- No `ssn`/`bank_*`/`income_*` column or field is ever added to `families`
  or its API/form.
- `devices.status` is written **only** inside `DeviceService.transitionDevice`
  (and thus only by code that calls it — `LeaseService` included).
  No route, adapter method other than `DeviceStore.updateStatus` called
  from that one place, or script may set it directly.
- No route, job, or script disables/locks/bricks a device for payment
  status. `PaymentService.getStatus` only computes a label.
- `LICENSE` stays GPL-3.0.
- Tests under `test/` are never edited by a task; a task that thinks a
  test is wrong reports it instead.
