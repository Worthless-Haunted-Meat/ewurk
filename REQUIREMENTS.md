# EWURK — Requirements

## 1. Problem

Staff and volunteers at a nonprofit refurbishing donated laptops/tablets for
low-income families currently track donations, device wipes, leases, and
payments on a spreadsheet and memory. That costs them the ability to answer,
on the spot, "what do you have, and what do we owe you?" — and worse, it can
lose the sanitization record for a donated business machine that held
customer data, which is the one failure that could end the program. Solved
looks like: a volunteer at a loading dock scans a 14-item donation in on her
phone in under five minutes and hands over a signed acknowledgment before she
leaves, and three months later a caseworker on the phone with a family pulls
up their name and sees the device, its wipe record, their payment history,
and their class attendance on one screen.

## 2. Users

- **Staff** — full access: donations, device lifecycle, leases/swaps,
  payments, hardship pauses, classes, attendance, family lookup.
- **Volunteer** — donation intake and device triage/wipe/refurb workflow
  only; no leases, payments, or class management.
- **Instructor** — class sessions and attendance only; no donations,
  devices, leases, or payments.
- *(No lessee/family login in v1 — families are records staff and
  caseworkers manage, not authenticated users.)*

## 3. Acceptance criteria

- **R1** WHEN a staff member or volunteer submits a new donation with a donor
  organization name and a pickup date THE SYSTEM SHALL create a donation
  record and display it with status "scheduled".
  **Check:** Browser — log in as the seeded volunteer, open `/donations/new`,
  enter donor org "St. Anne's Parish" and a pickup date, submit. Expect the
  donation detail page to show "St. Anne's Parish" and status "scheduled".

- **R2** WHEN a staff member or volunteer records a received item on an open
  donation with a model and serial number THE SYSTEM SHALL create a device
  record with a unique, sequentially minted asset tag and status "received",
  linked to that donation.
  **Check:** Browser — on the donation page, click "Receive item", enter a
  model and serial, submit, repeat for 3 items. Expect 3 rows each with a
  distinct asset tag matching `EW-\d{4,}` and status "received"; item count
  on the donation reads 3.

- **R3** WHEN a staff member requests the tax acknowledgment for a donation
  with at least one received item THE SYSTEM SHALL generate a letter listing
  the donor's name, the donation date, and a description of each item, and
  SHALL mark the donation "acknowledged".
  **Check:** Browser — from the donation page, click "Generate
  acknowledgment". Expect the letter to show "St. Anne's Parish", the pickup
  date, and one line per received item's model; donation status badge reads
  "acknowledged".

- **R4** THE SYSTEM SHALL NOT print any dollar amount, valuation, or price on
  a tax acknowledgment letter, regardless of donation contents.
  **Check:** `curl -s localhost:3000/donations/1/acknowledgment | grep -E
  '\$|USD|[Vv]alue'` — expect no match (exit code 1). Also confirmed in the
  R3 browser check by reading the full letter text.

- **R5** WHEN a staff member or volunteer advances a device to the next
  valid lifecycle step
  (`received→triaged→wiped→refurbished→imaged→available→leased→returned→repair→retired`)
  THE SYSTEM SHALL update its status and append a timeline entry with actor
  and timestamp; THE SYSTEM SHALL reject any transition that is not that
  device's defined next step.
  **Check:** Browser at a 375×667 viewport — open a "received" device, tap
  "Mark triaged" one-handed; expect status "triaged" and a new timeline row.
  Then `curl -X POST localhost:3000/api/devices/:id/transition -d
  '{"to":"leased"}'` on that same device; expect HTTP 409 and
  `{"error":{"code":"INVALID_TRANSITION"}}`.

- **R6** A device SHALL NOT reach status "available" without a recorded
  sanitization (method, date, operator); WHEN a wipe is recorded THE SYSTEM
  SHALL require all three fields.
  **Check:** `curl -X POST localhost:3000/api/devices/:id/transition -d
  '{"to":"available"}'` on an un-wiped device returns HTTP 409
  `{"error":{"code":"WIPE_REQUIRED"}}` and status is unchanged. Browser — on
  that device's page, "Mark available" is absent/disabled; fill in wipe
  method, date, operator and submit; "Mark available" now appears and
  succeeds, status becomes "available".

- **R7** WHEN a staff member opens a device's page by its asset tag THE
  SYSTEM SHALL show its full timeline (receipt, triage, wipe record,
  refurb, lease/swap history) on one page.
  **Check:** Browser — open `/devices/EW-0001`. Expect every lifecycle event
  so far listed chronologically with actor and date, no extra clicks needed.

- **R8** WHEN a staff member searches devices by serial number THE SYSTEM
  SHALL return the matching device showing its donor organization, its wipe
  operator/date, and its current holder (family name or "in stock").
  **Check:** Browser — on `/devices`, type a seeded serial into the search
  box, submit. Expect one result showing donor org, wipe operator, and
  holder.

- **R9** WHEN a staff member creates a lease linking one family to one
  "available" device THE SYSTEM SHALL set the device to "leased", record a
  lease start date, and reject a second concurrent lease for a family that
  already holds an active one.
  **Check:** Browser — open a family with no lease, click "Start lease",
  pick an available device, submit. Expect an active lease with today's
  start date and the device now "leased". Repeat "Start lease" for the same
  family; expect a visible error and no second lease created.

- **R10** WHEN staff swap an active lease's device for a replacement that is
  "available" THE SYSTEM SHALL set the outgoing device to "repair", the
  incoming device to "leased", keep the lease's start date and status
  unchanged, and record a replaced-by/replaces link between the two devices.
  **Check:** Browser — on a lease holding EW-0042, click "Swap", choose
  EW-0088, submit. Expect the lease's start date unchanged. Open
  `/devices/EW-0042`: status "repair", "replaced by EW-0088". Open
  `/devices/EW-0088`: status "leased", "replaces EW-0042".

- **R11** WHEN a staff member opens a lease or family page THE SYSTEM SHALL
  list every device that family has ever held, with dates leased and
  returned/swapped.
  **Check:** Browser — after the R10 swap, open the family's page. Expect
  two device rows (EW-0042 ended at the swap date, EW-0088 ongoing) under
  one lease.

- **R12** WHEN staff record a payment amount and date against a lease THE
  SYSTEM SHALL add it to that lease's ledger and recompute the paid-through
  date.
  **Check:** Browser — on a lease page, "Record payment", enter $20 and
  today, submit. Expect a new ledger row and paid-through date advanced by
  one month.

- **R13** WHILE a lease's paid-through date is before today THE SYSTEM SHALL
  display it as "behind"; WHILE paid-through is today or later THE SYSTEM
  SHALL display it as "current".
  **Check:** Browser — open a seeded lease with 2+ unpaid months; expect a
  "behind" badge on the lease and family pages. Record payment enough to
  cover through next month; expect the badge to change to "current" in
  place.

- **R14** WHEN staff mark a lease "hardship pause" THE SYSTEM SHALL stop
  showing it as "behind" and SHALL keep it active (device stays "leased",
  start date unchanged).
  **Check:** Browser — on a "behind" lease, "Hardship pause", enter a
  reason, submit. Expect badge "paused" (not "behind"/"current") and the
  device page still reads "leased".

- **R15** WHILE a lease is "behind" THE SYSTEM SHALL take no automated
  action against the device or family beyond the "behind" label — no route,
  job, or UI control locks, disables, or restricts a leased device for
  non-payment.
  **Check:** `curl -s localhost:3000/api | grep -iE 'lock|disable|brick'`
  returns no matches. Browser — on a "behind" lease's device page, confirm
  the only actions offered are normal lifecycle ones (swap, return, repair);
  no suspend/disable control exists anywhere.

- **R16** WHEN an instructor or staff member creates a class session with a
  date and topic THE SYSTEM SHALL create it and list it on `/classes`.
  **Check:** Browser — log in as instructor, `/classes/new`, enter date and
  topic "Intro to Linux", submit. Expect it on `/classes`.

- **R17** WHEN a session is rostered THE SYSTEM SHALL populate it with every
  family currently holding an active (non-ended, non-swapped-away) lease,
  and no others.
  **Check:** Browser — on a session, "Build roster". Expect the Herrera
  family (active lease) present and any family with an ended lease absent,
  cross-checked against `/leases`.

- **R18** WHEN an instructor marks a rostered family present or absent for a
  session THE SYSTEM SHALL save that attendance record against that family
  and session.
  **Check:** Browser — on a roster, toggle a family "present", navigate away
  and back. Expect the mark to persist.

- **R19** WHEN staff or a caseworker search for a family by name THE SYSTEM
  SHALL show, on one page with no further navigation, that family's current
  device (asset tag), its wipe record, its payment status, and its class
  attendance history.
  **Check:** Browser — `/families`, type "Herrera", open the result. Expect
  device asset tag + wipe method/date, payment status badge, and attendance
  list all visible on that single page.

- **R20** WHEN a user submits their org email to sign in THE SYSTEM SHALL
  issue a single-use magic link (written to a local dev outbox instead of a
  real mail provider) that starts a session when opened within its validity
  window; THE SYSTEM SHALL store no passwords.
  **Check:** `curl -X POST localhost:3000/auth/magic-link -d
  '{"email":"<seeded staff email>"}'`; `curl -s localhost:3000/dev/outbox`
  to read the link; open it in a browser — expect redirect to a dashboard
  showing the user's name/role. `sqlite3 data/ewurk.db ".schema users"` has
  no password column.

- **R21** WHILE logged in as "volunteer" THE SYSTEM SHALL show only intake
  and device workflow screens and SHALL block lease/payment/class routes;
  WHILE logged in as "instructor" THE SYSTEM SHALL show only class/attendance
  screens and SHALL block donation/device/lease routes.
  **Check:** Browser — as volunteer, confirm nav has no "Leases"/"Classes"
  link; typing `/leases` directly shows a visible "not authorized" page, not
  the lease list. Repeat as instructor against `/donations/new`.

- **R22** THE family/lessee form SHALL collect only name, contact
  (phone/email), and neighborhood/referral source, and SHALL have no
  field, column, or API parameter for SSN, bank account, or income
  documentation.
  **Check:** Browser — `/families/new`, read every label; none reads "SSN",
  "Social Security", "bank", "account number", or "income". `curl -X POST
  localhost:3000/api/families -d '{"name":"Test","ssn":"123-45-6789"}'` then
  `curl localhost:3000/api/families/:id` — no `ssn` field/value present.

- **R23** WHEN the seed script runs against a fresh database THE SYSTEM
  SHALL create one donation with items, five devices spread across at least
  four different lifecycle stages, two leases, and one swap.
  **Check:** `npm run seed && curl -s localhost:3000/api/devices | jq
  'length'` → `5`; `curl -s localhost:3000/api/devices | jq '[.[].status] |
  unique | length'` → `≥4`; `curl -s localhost:3000/api/leases | jq
  'length'` → `2`; one seeded device page shows a replaces/replaced-by link.

- **R24** THE repository SHALL be licensed GPL-3.0.
  **Check:** `head -3 LICENSE` shows "GNU GENERAL PUBLIC LICENSE" / "Version
  3"; `node -p "require('./package.json').license"` prints a GPL-3.0
  identifier.

- **R25** WHEN a client requests a path under `/api` that does not exist THE
  SYSTEM SHALL respond 404 with `{"error":{"code":"NOT_FOUND","message":...}}`.
  **Check:** `curl -s -o /tmp/o -w '%{http_code}'
  localhost:3000/api/does-not-exist` prints `404`; `cat /tmp/o` matches
  `{"error":{"code":"NOT_FOUND"`.

## 4. Workflows

- **W1** Loading-dock donation intake to signed acknowledgment (R20, R1, R2, R3, R4)
  1. Volunteer requests a magic link for her seeded email and opens it from
     the dev outbox to sign in.
  2. On a phone-width viewport she creates a donation for "St. Anne's
     Parish" with today as pickup date.
  3. She receives 14 items one at a time, each minting a new asset tag.
  4. Back at the shop she opens the donation and generates the
     acknowledgment letter.
  5. She confirms the letter names every item and contains no dollar figure
     anywhere.

- **W2** Wipe-gated device availability (R5, R6, R7)
  1. Staff opens a "received" device and marks it "triaged".
  2. She tries to mark it "available"; the action is refused/absent.
  3. She records a wipe (method, date, operator).
  4. "Mark available" now works; she uses it.
  5. The device's timeline page shows every step from receipt to available
     with actor and date.

- **W3** Lease, class enrollment, swap, payment, and the one-screen
  caseworker view (R9, R10, R11, R12, R13, R14, R16, R17, R18, R19)
  1. Caseworker leases asset EW-0042 to the Herrera family.
  2. She builds a Saturday class roster off active leases; the Herrera
     family is picked up automatically.
  3. Two months later the screen cracks; she swaps EW-0042 for EW-0088 on
     the same lease.
  4. She checks the family page: one lease, both devices listed, start date
     unchanged.
  5. She records a $20 payment and watches the paid-through date advance.
  6. On a second seeded lease with two unpaid months she confirms it shows
     "behind", then applies a hardship pause and confirms it now reads
     "paused".
  7. Back on the Herrera family page she marks class attendance present.
  8. She searches "Herrera" and sees device, wipe record, payment status,
     and attendance on one page.

- **W4** Serial-to-custody lookup (R8)
  1. Staff takes a serial number off a laptop lid and searches devices by
     serial.
  2. The result shows the donor org, the wipe operator, and the current
     holder.

- **W5** Role boundaries hold (R21, R22)
  1. Log in as the seeded volunteer; confirm the nav hides Leases/Classes
     and `/leases` is blocked.
  2. Log in as the seeded instructor; confirm `/donations/new` is blocked.
  3. As staff, open `/families/new` and confirm no SSN/bank/income fields
     exist.

- **W6** Fresh clone is explorable (R23, R24)
  1. Clone the repo, run install/build/seed/start per the README.
  2. Confirm 5 devices across ≥4 stages, 2 leases, and 1 swap are visible
     with no manual data entry.
  3. Confirm `LICENSE` is GPL-3.0.

## 5. Coverage

- M1: R1, R2, R3, R4
- M2: R5, R6, R7, R8
- M3: R9, R10, R11
- M4: R12, R13, R14, R15
- M5: R16, R17, R18

## 6. Non-goals (v1)

- Live/automated recurring billing (Square, Stripe, or any processor).
- Lessee self-service login or portal.
- Donor self-serve pickup request form on the public site.
- Bulk CSV import for a large single donation.
- Device imaging/provisioning integration; remote wipe of leased hardware.
- Waitlist and neighborhood referral partner accounts.
- Spanish-language UI.
- Google Workspace SSO (deferred; magic-link only in v1).
- Postgres/Azure hosting or IaC automation (v1 runs on SQLite locally; this
  is documented follow-on infrastructure work, not part of this job).
- Real outbound email delivery (a local dev outbox stands in for a mail
  provider; nothing here is a paid service or an account).
- Collecting SSN, bank details, or income documentation from families.
- Any automated enforcement (lock/disable/brick) against a device for
  non-payment.
- Desktop-only layouts — mobile-first is required for every screen, not
  just intake and status-change.

## 7. Decisions

- **Job kind: build.** The repository contains only a template `AGENTS.md`/
  `QWEN.md` and a one-line `README.md` — no application code exists yet.
  Requirements describe the whole v1 product.
- Stack: Node.js + TypeScript, Express, server-rendered EJS views (auto-
  escaping by default), `better-sqlite3` for storage. Chosen over the
  experimental built-in `node:sqlite` because it is stable, is the most
  widely used SQLite binding in the Node ecosystem, and gives the strongest
  test tooling — the "prefer built-ins" constraint is a preference, not an
  absolute, and is outweighed here by maturity and tooling.
- Persistence: **SQLite only for v1**, file-backed by default
  (`data/ewurk.db`), in-memory for tests. The job brief's "Shape" section
  mentions Postgres/Azure hosting, but the operator's explicit constraint
  ("storage defaults to SQLite or in-memory, no paid services, no accounts,
  no secrets") takes precedence for this job. Postgres/Azure deployment is
  listed under Non-goals as follow-on infrastructure work.
- Auth: **magic-link only** for v1. Google Workspace SSO needs an OAuth app
  registration and a client secret, which conflicts with "no accounts, no
  secrets" for this phase, so it is deferred. Magic links are not emailed
  (no paid mail provider); in dev/test they are written to a local
  `/dev/outbox` route, documented as dev/test-only and not present in a
  production build.
- No lessee/family login in v1, per Shape — families are staff-managed
  records, never authenticated principals.
- Money is stored and computed as integer cents throughout; only formatted
  to dollars at render time, to keep the "current/behind" math exact.
- Asset tags are minted sequentially as `EW-####` at item-receipt time.
- Device status changes only through one guarded transition action (not a
  free-form status edit), so the wipe-before-available gate is structural
  rather than a UI reminder that can be bypassed by a future screen.
- "Current"/"behind" is computed purely from lease start date + the fixed
  $20/month schedule vs. the sum of recorded payments; there is no external
  invoicing engine.
- Hardship pause is a flag on the lease, not a lifecycle state; it does not
  end or restart the lease clock.
- Test runner: Node's built-in `node:test` + `node:assert` for unit/API
  tests (small dependency footprint, strong built-in tooling), Playwright
  Test for the browser-flow requirements, both run by `npm test`.
- License is GPL-3.0 from the first commit, per the operator's constraint.

```json requirements
{ "requirements": [
    { "id": "R1", "text": "WHEN a staff member or volunteer submits a new donation with a donor org and pickup date THE SYSTEM SHALL create it with status \"scheduled\".", "check": "Browser: /donations/new -> submit St. Anne's Parish + pickup date -> detail page shows name and status scheduled." },
    { "id": "R2", "text": "WHEN an item is received on a donation THE SYSTEM SHALL create a device with a unique sequential asset tag and status received.", "check": "Browser: receive 3 items -> 3 rows each with distinct EW-#### tag, status received, item count = 3." },
    { "id": "R3", "text": "WHEN staff generate a tax acknowledgment for a donation with items THE SYSTEM SHALL list donor, date, and each item's description and mark the donation acknowledged.", "check": "Browser: Generate acknowledgment -> letter shows donor, date, item lines; donation badge reads acknowledged." },
    { "id": "R4", "text": "THE SYSTEM SHALL NOT print any dollar amount or valuation on an acknowledgment letter.", "check": "curl -s localhost:3000/donations/1/acknowledgment | grep -E '\\$|USD|[Vv]alue' -> no match." },
    { "id": "R5", "text": "WHEN a device is advanced to its next valid lifecycle step THE SYSTEM SHALL update status and log a timeline entry; invalid transitions are rejected.", "check": "Mobile viewport: mark triaged succeeds with timeline row; curl transition to leased from triaged -> 409 INVALID_TRANSITION." },
    { "id": "R6", "text": "A device SHALL NOT reach available without a wipe record (method, date, operator).", "check": "curl transition to available with no wipe -> 409 WIPE_REQUIRED; after recording wipe, transition succeeds." },
    { "id": "R7", "text": "WHEN staff open a device page THE SYSTEM SHALL show its full timeline on one page.", "check": "Browser: /devices/EW-0001 shows chronological events with actor/date." },
    { "id": "R8", "text": "WHEN staff search devices by serial THE SYSTEM SHALL show donor, wipe operator/date, and current holder.", "check": "Browser: search seeded serial -> one result with donor, wiper, holder." },
    { "id": "R9", "text": "WHEN a lease is created for an available device THE SYSTEM SHALL set the device leased and reject a second concurrent lease for the same family.", "check": "Browser: Start lease succeeds; repeating for same family shows error, no second lease." },
    { "id": "R10", "text": "WHEN staff swap a lease's device THE SYSTEM SHALL move outgoing device to repair, incoming to leased, keep lease start date/status, and link the two devices.", "check": "Browser: swap EW-0042->EW-0088; lease start date unchanged; EW-0042 repair/replaced-by; EW-0088 leased/replaces." },
    { "id": "R11", "text": "WHEN staff open a lease or family page THE SYSTEM SHALL list every device that family has ever held with dates.", "check": "Browser: family page shows EW-0042 (ended) and EW-0088 (ongoing) under one lease." },
    { "id": "R12", "text": "WHEN staff record a payment THE SYSTEM SHALL add it to the ledger and recompute paid-through date.", "check": "Browser: record $20 payment -> ledger row added, paid-through advances one month." },
    { "id": "R13", "text": "WHILE paid-through is before today THE SYSTEM SHALL show behind; WHILE paid-through is today or later THE SYSTEM SHALL show current.", "check": "Browser: unpaid lease shows behind; after payment shows current." },
    { "id": "R14", "text": "WHEN staff mark a lease hardship-paused THE SYSTEM SHALL stop showing it behind and keep it active.", "check": "Browser: Hardship pause on a behind lease -> badge paused, device still leased." },
    { "id": "R15", "text": "WHILE a lease is behind THE SYSTEM SHALL take no automated action against device/family beyond the label.", "check": "curl localhost:3000/api | grep -iE 'lock|disable|brick' -> no match; UI has no suspend control." },
    { "id": "R16", "text": "WHEN a class session is created with date/topic THE SYSTEM SHALL list it on /classes.", "check": "Browser: /classes/new submit -> appears on /classes." },
    { "id": "R17", "text": "WHEN a session is rostered THE SYSTEM SHALL populate it with every family holding an active lease and no others.", "check": "Browser: Build roster includes active-lease families only, cross-checked against /leases." },
    { "id": "R18", "text": "WHEN attendance is marked for a rostered family THE SYSTEM SHALL persist it.", "check": "Browser: toggle present, navigate away/back, mark persists." },
    { "id": "R19", "text": "WHEN staff search a family by name THE SYSTEM SHALL show device, wipe record, payment status, and attendance on one page.", "check": "Browser: /families search Herrera -> single page shows all four." },
    { "id": "R20", "text": "WHEN a user requests a magic link THE SYSTEM SHALL issue a single-use link (dev outbox) that starts a session; no passwords stored.", "check": "curl POST /auth/magic-link, curl /dev/outbox for link, open it -> session starts; users table has no password column." },
    { "id": "R21", "text": "WHILE logged in as volunteer/instructor THE SYSTEM SHALL restrict screens/routes to their scope.", "check": "Browser: volunteer blocked from /leases; instructor blocked from /donations/new." },
    { "id": "R22", "text": "THE family form SHALL collect only name/contact/neighborhood and SHALL have no SSN/bank/income field.", "check": "Browser: /families/new has no such labels; API POST with ssn field does not persist it." },
    { "id": "R23", "text": "WHEN the seed script runs THE SYSTEM SHALL create 1 donation w/ items, 5 devices across >=4 stages, 2 leases, 1 swap.", "check": "npm run seed; curl API counts match: 5 devices, >=4 distinct statuses, 2 leases, one swap link visible." },
    { "id": "R24", "text": "THE repository SHALL be licensed GPL-3.0.", "check": "head -3 LICENSE shows GPL v3; package.json license field is a GPL-3.0 identifier." },
    { "id": "R25", "text": "WHEN an unknown /api path is requested THE SYSTEM SHALL respond 404 with a JSON error envelope.", "check": "curl -o /tmp/o -w '%{http_code}' localhost:3000/api/does-not-exist -> 404; body matches error.code NOT_FOUND." }
  ],
  "workflows": [
    { "id": "W1", "title": "Loading-dock donation intake to signed acknowledgment", "requirements": ["R20","R1","R2","R3","R4"], "steps": ["Sign in via magic link from dev outbox", "Create donation for St. Anne's Parish with pickup date on a phone viewport", "Receive 14 items, each minting an asset tag", "Generate the acknowledgment letter", "Confirm no dollar figure appears anywhere in the letter"] },
    { "id": "W2", "title": "Wipe-gated device availability", "requirements": ["R5","R6","R7"], "steps": ["Mark a received device triaged", "Attempt to mark available; refused/absent", "Record wipe method/date/operator", "Mark available succeeds", "Timeline page shows full history"] },
    { "id": "W3", "title": "Lease, class enrollment, swap, payment, and the one-screen caseworker view", "requirements": ["R9","R10","R11","R12","R13","R14","R16","R17","R18","R19"], "steps": ["Lease EW-0042 to the Herrera family", "Build class roster off active leases", "Swap EW-0042 for EW-0088 on the same lease", "Confirm family page lists both devices, lease start date unchanged", "Record a $20 payment, paid-through advances", "Confirm a second lease shows behind, then paused after hardship pause", "Mark class attendance present for Herrera", "Search Herrera and see device+wipe+payment+attendance on one page"] },
    { "id": "W4", "title": "Serial-to-custody lookup", "requirements": ["R8"], "steps": ["Search devices by a serial number off a laptop lid", "Confirm donor, wipe operator, and current holder are shown"] },
    { "id": "W5", "title": "Role boundaries hold", "requirements": ["R21","R22"], "steps": ["As volunteer, confirm Leases/Classes hidden and /leases blocked", "As instructor, confirm /donations/new blocked", "As staff, confirm /families/new has no SSN/bank/income fields"] },
    { "id": "W6", "title": "Fresh clone is explorable", "requirements": ["R23","R24"], "steps": ["Clone, install, build, seed, start per README", "Confirm 5 devices across >=4 stages, 2 leases, 1 swap visible", "Confirm LICENSE is GPL-3.0"] }
  ],
  "coverage": { "M1": ["R1","R2","R3","R4"], "M2": ["R5","R6","R7","R8"], "M3": ["R9","R10","R11"], "M4": ["R12","R13","R14","R15"], "M5": ["R16","R17","R18"] } }
```
