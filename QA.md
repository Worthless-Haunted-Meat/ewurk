# EWURK — QA

Every scenario below shares the same setup unless noted otherwise:

**Given (standard):** fresh clone; `npm ci && npx playwright install chromium`;
`npm run build`; `EWURK_DB_PATH=data/qa.db PORT=3500 npm run seed`;
`EWURK_DB_PATH=data/qa.db PORT=3500 npm start` (leave running in the
background); browser or `curl` requests target `http://localhost:3500`.

**Standard sign-in** (reused by name below as "sign in as `<role>`"): open
`http://localhost:3500/login`, type the role's seeded email into "Work
email" (staff: `staff@ewurk.org`, volunteer: `volunteer@ewurk.org`,
instructor: `instructor@ewurk.org`), click "Send sign-in link", then
`curl -s http://localhost:3500/dev/outbox` and find the entry whose `to`
matches the email; open the `http://localhost:3500/auth/verify?token=...`
link its `body` contains. The browser lands on the dashboard showing the
signed-in user's name.

Every scenario creates its own donation/family/device/session with a
name or serial unique to that scenario (e.g. suffixed `-Q7`), so an
earlier scenario's data cannot change this one's counts.

## Q1 (R1): create a donation

Given: standard, signed in as staff.
When: open `/donations`. Type "Q1 Donor Org" into "Donor organization".
Type "2026-03-01" into "Pickup date". Click "Create donation".
Then: the page navigates to `/donations/<id>` and shows heading "Q1 Donor
Org" and status "scheduled".
Evidence: screenshot of the donation detail page; the URL.

## Q2 (R2): receive an item mints a fresh asset tag

Given: standard, signed in as staff, on a donation detail page (Q1).
When: type "Dell Latitude 5490" into "Model", "SN-Q2-1" into "Serial
number", click "Receive item". Repeat with "SN-Q2-2".
Then: "Items (2)" is visible; two distinct links matching `EW-####` appear,
each with status "received".
Evidence: screenshot of the items list.

## Q3 (R3): generate an acknowledgment letter

Given: standard, signed in as staff, on the Q2 donation (has 2 items).
When: click "Generate acknowledgment letter".
Then: the letter page shows "Contemporaneous Written Acknowledgment", the
donor name, the pickup date, one line per item's model, and the sentence
"No goods or services were provided in exchange for this donation."; the
donation's status badge (back on its detail page) now reads "acknowledged".
Evidence: screenshot of the letter.

## Q4 (R4): the acknowledgment never states a dollar value

Given: standard, signed in as staff, on the Q3 acknowledgment letter.
When: read every line of the letter.
Then: no `$` character and no digit sequence adjacent to "value"/"worth"
appears anywhere on the page.
Evidence: `curl -s http://localhost:3500/donations/<id>/acknowledgment | grep -E '\$|worth|value'` returns no match (exit 1), as a second line of evidence alongside the visual read.

## Q5 (R5): an out-of-order device transition is refused

Given: standard, signed in as staff, on a `received` device's page (e.g. a Q2 device, still received).
When: click "Mark triaged" (succeeds; status becomes "triaged", a new
timeline row appears). Then run
`curl -s -o /tmp/q5 -w '%{http_code}' -X POST http://localhost:3500/api/devices/<assetTag>/transition -H 'Content-Type: application/json' -d '{"to":"leased"}' -b <staff session cookie>`.
Then: prints `409`; `cat /tmp/q5` matches `{"error":{"code":"INVALID_TRANSITION"`.
Evidence: the printed status code and body; the device's status is still "triaged" on reload.

## Q6 (R6): a device cannot reach available without a wipe record

Given: standard, signed in as staff, on the Q5 device (now "triaged").
When: observe the page — no "Mark available" button is present, only a
"Record wipe" form (Wipe method / Wipe date / Operator). Fill "NIST SP
800-88 Clear" / today's date / "QA Tester", click "Record wipe". Click
"Mark refurbished", then "Mark imaged".
Then: "Mark available" now appears; click it; status becomes "available".
Evidence: screenshot before (no button) and after (button present, then
status "available"); the timeline lists received, triaged, wiped,
refurbished, imaged, available in order.

## Q7 (R7): a device's full timeline is visible on one page

Given: standard, signed in as staff, on the Q6 device (now "available").
When: open `/devices/<assetTag>`.
Then: every lifecycle event so far (received, triaged, wiped, refurbished,
imaged, available) is listed with an actor and a date, with no further
navigation required.
Evidence: screenshot of the Timeline section.

## Q8 (R8): serial-number search shows donor, wiper, and holder

Given: standard, signed in as staff, with the Q6 device (serial known,
donor "Q1 Donor Org", wiped by "QA Tester", not yet leased).
When: open `/devices`, type the device's serial into "Search by serial
number", click "Search".
Then: one result shows "Q1 Donor Org", "QA Tester", and "in stock".
Evidence: screenshot of the result row.

## Q9 (R9): a lease binds one family to one available device

Given: standard, signed in as staff, with one more device driven to
"available" (repeat Q6's wipe steps on a fresh Q9 item) and a new family
"Q9 Family" (see Q22's steps for creating a family) with no lease.
When: on the Q9 family's page, pick the available device under "Start
lease" and click "Start lease". Then click "Start lease" again for the
same family (any available device).
Then: the first click shows an active lease with today's start date and
the device now "leased"; the second click shows a visible error and no
second lease is created (the family page still shows exactly one lease).
Evidence: screenshot of the family page after each attempt.

## Q10 (R10): swap keeps the lease and moves both devices

Given: standard, signed in as staff, with the Q9 lease and a second
available device ("Q10 spare", driven to available like Q6).
When: open the Q9 lease's page, pick "Q10 spare" under "Replacement
device", click "Swap".
Then: the lease's "Since" date is unchanged; the outgoing device's page
now reads "repair" and "replaced by <Q10 spare tag>"; the Q10 spare's page
reads "leased" and "replaces <outgoing tag>".
Evidence: screenshots of both device pages and the lease page's "Since" line before/after.

## Q11 (R11): the custody chain lists every device a lease has held

Given: standard, signed in as staff, on the Q10 lease's page (post-swap).
When: read the "Custody chain" section.
Then: two rows are listed — the outgoing device with an end date matching
the swap date, and the Q10 spare with no end date ("present").
Evidence: screenshot of the Custody chain section.

## Q12 (R12): recording a payment updates the ledger

Given: standard, signed in as staff, on the Q10 lease's page.
When: type "20" into "Amount ($)", today's date into "Date", click
"Record payment".
Then: a new row appears in the payment table; the "paid through" date
shown next to the status badge advances by one month.
Evidence: screenshot of the ledger table before/after.

## Q13 (R13): current vs. behind reflects the payment schedule

Given: standard, signed in as staff, with a fresh family+lease ("Q13
Family") whose device was leased more than a month ago with no payments
(use Q9's steps, then wait — or, since "more than a month ago" cannot be
waited for in a QA session, use a lease from the seed data, whose start
date is in the past with no payments yet: open its lease page directly).
When: read the status badge on that lease's page.
Then: it reads "behind". Record a payment covering the elapsed months
(see Q12); the badge changes to "current" without navigating anywhere else.
Evidence: screenshot of the badge before and after payment.

## Q14 (R14): hardship pause stops the "behind" label without ending the lease

Given: standard, signed in as staff, on a lease currently reading "behind"
(Q13, before its payment).
When: click "Pause for hardship".
Then: the badge reads "paused" (not "behind" or "current"); the leased
device's own page still reads "leased" (not returned/repair/retired).
Evidence: screenshot of the badge and of the device page.

## Q15 (R15): non-payment never triggers an automated action

Given: standard, on the Q13 lease while it reads "behind" (before pausing).
When: `curl -s http://localhost:3500/api | grep -iE 'lock|disable|brick'`.
Also look at the "behind" lease's device page for any suspend/disable
control.
Then: the curl command prints nothing (no match, exit 1); the device page
offers only ordinary lifecycle actions (swap, return, repair) — no
suspend/disable/lock control exists anywhere in the UI.
Evidence: the curl output (or lack of it); screenshot of the device page's action list.

## Q16 (R16): create a class session

Given: standard, signed in as instructor.
When: open `/classes`, type "2026-03-07" into "Date", "Q16 Class" into
"Topic", click "Create session".
Then: `/classes` lists "2026-03-07 — Q16 Class".
Evidence: screenshot of the classes list.

## Q17 (R17): rostering pulls only families with an active lease

Given: standard, signed in as instructor, with the Q16 session, and (as
staff, in another tab or session) a family with an active lease ("Q9
Family" from Q9) and a family with no lease ("Q17 No-Lease Family",
created but never leased).
When: on the Q16 session, click "Build roster".
Then: "Q9 Family" appears in the roster; "Q17 No-Lease Family" does not.
Evidence: screenshot of the roster list.

## Q18 (R18): marking attendance persists

Given: standard, signed in as instructor, on the Q17 roster.
When: click "Mark present" next to "Q9 Family". Reload the page.
Then: the row still reads "present" after reload.
Evidence: screenshot before/after reload.

## Q19 (R19): the family page shows device, wipe, payment, and attendance together

Given: standard, signed in as staff, with "Q9 Family" (leased, wiped
device, at least one payment from Q12, marked present in Q18).
When: open `/families`, type "Q9 Family" into "Search by name", click
"Search", click the "Q9 Family" result.
Then: on that single page, without further navigation: the current
device's asset tag and wipe method/date are visible, a payment status
badge is visible, and the Q18 attendance row is visible.
Evidence: one screenshot of the whole page showing all four.

## Q20 (R20): magic-link sign-in issues no password

Given: standard.
When: `curl -X POST http://localhost:3500/auth/magic-link -H 'Content-Type: application/json' -d '{"email":"staff@ewurk.org"}'`;
`curl -s http://localhost:3500/dev/outbox`; open the returned
`.../auth/verify?token=...` link in a browser.
Then: the browser lands on the dashboard showing "Staff One". A bogus
token (`/auth/verify?token=not-a-real-token`) returns HTTP 401 and does
not start a session.
Evidence: the dashboard screenshot; the 401 response for the bogus token.

## Q21 (R21): roles are confined to their screens

Given: standard, signed in as volunteer.
When: look at the top navigation. Then type `/leases` directly into the
address bar. Sign out; sign in as instructor; type `/donations` into the
address bar.
Then: the volunteer's nav has no "Leases" or "Classes" link, and
`/leases` shows a page headed "Not authorized" (not the lease list); the
instructor's `/donations` also shows "Not authorized".
Evidence: screenshots of the nav and of each "Not authorized" page.

## Q22 (R22): the family form collects no SSN/bank/income data

Given: standard, signed in as staff.
When: open `/families` and read every visible field label. Then
`curl -X POST http://localhost:3500/api/families -H 'Content-Type: application/json' -d '{"name":"Q22 Family","contact":"555-Q22","ssn":"123-45-6789"}' -b <staff session cookie>`,
then `curl http://localhost:3500/api/families/<id>`.
Then: the form has only "Name", "Contact", and "Neighborhood / referral" —
no field mentions SSN, Social Security, bank, account, or income; the
created family's JSON has no `ssn` key anywhere.
Evidence: screenshot of the form; the two curl responses.

## Q23 (R23): seed data is explorable on first run

Given: standard (this is exactly what the seed step already did).
When: signed in as staff, open `/devices`.
Then: at least 5 devices with serials starting `SN-SEED-` are listed,
spanning at least 4 different statuses; open `/families`, search "Herrera
Family" and "Osei Family" — both exist with an active lease; one seeded
device's page shows a "replaces"/"replaced by" link.
Evidence: screenshots of the devices list and both family pages.

## Q24 (R24): the repository is licensed GPL-3.0

Given: fresh clone (no server needed).
When: `head -3 LICENSE`; `node -p "require('./package.json').license"`.
Then: the LICENSE header reads "GNU GENERAL PUBLIC LICENSE" / "Version
3"; the package.json license field contains "GPL-3.0".
Evidence: both command outputs.

## Q25 (R25): an unknown API path returns a JSON 404

Given: standard.
When: `curl -s -o /tmp/q25 -w '%{http_code}' http://localhost:3500/api/does-not-exist`.
Then: prints `404`; `cat /tmp/q25` matches `{"error":{"code":"NOT_FOUND"`.
Evidence: the printed status code and body.

## Q26 (W1): loading-dock donation intake to signed acknowledgment

Given: standard.
When:
1. Open `/login`. Type `volunteer@ewurk.org` into "Work email", click
   "Send sign-in link". Read `/dev/outbox` for the link and open it —
   expect the dashboard to show "Vera Volunteer".
2. Click "Donations". Type "St. Anne's Parish (W1)" into "Donor
   organization" and a pickup date, click "Create donation" — expect the
   page to land on the new donation showing that name and "scheduled".
3. Receive 14 items one at a time (model "Dell Latitude 5490", serials
   `SN-W1-1`..`SN-W1-14`) — expect "Items (14)" and 14 distinct `EW-####`
   links after the last submission.
4. Click "Generate acknowledgment letter" — expect the letter to list all
   14 items and the donor name.
5. Read the whole letter — expect no `$` character or dollar figure
   anywhere on the page.
Evidence: a screenshot after each numbered step.

## Q27 (W2): wipe-gated device availability

Given: standard.
When:
1. Sign in as staff. Open a `received` device (from Q2/seed) — expect
   status "received" and only a "Mark triaged" action.
2. Click "Mark triaged" — expect status "triaged" and a new timeline row.
3. Observe: no "Mark available" button is offered — expect only the
   "Record wipe" form to be visible.
4. Fill the wipe form (method, date, operator) and submit — expect status
   "wiped" and the fields to persist.
5. Click "Mark refurbished", then "Mark imaged" — expect status "imaged"
   and "Mark available" now visible.
6. Click "Mark available" — expect status "available" and the Timeline
   section to list every step from receipt to available with actor/date.
Evidence: a screenshot after each numbered step.

## Q28 (W3): lease, class enrollment, swap, payment, and the one-screen caseworker view

Given: standard.
When:
1. Sign in as staff. Create a fresh family "W3 QA Family" and lease it an
   available device (driven to available first, per Q6) — expect the
   family page to show an active lease.
2. Create a class session and click "Build roster" — expect "W3 QA
   Family" to appear on the roster.
3. On the lease's page, swap the device for a second available device —
   expect the lease's "Since" date unchanged and the new device now
   "leased".
4. Reopen the family page — expect both devices listed under one lease
   with dates.
5. Record a $20 payment on the lease — expect the ledger to grow by one
   row and the badge to read "current" (or record enough to cover a
   "behind" lease and see it flip).
6. Click "Pause for hardship" — expect the badge to read "paused" and the
   device to remain "leased"; click it again to resume.
7. On the class roster, mark "W3 QA Family" present — expect it to read
   "present" after a reload.
8. Search "W3 QA Family" on `/families` and open it — expect device, wipe
   record, payment status, and attendance all visible on that one page.
Evidence: a screenshot after each numbered step.

## Q29 (W4): serial-to-custody lookup

Given: standard.
When:
1. Sign in as staff. Take the serial off a wiped, available device (from
   Q6/seed) and open `/devices`.
2. Type that serial into "Search by serial number" and search — expect
   one result.
3. Read the result — expect the donor organization, the wipe operator,
   and the holder ("in stock", or a family name if leased) all shown.
Evidence: a screenshot of the search result.

## Q30 (W5): role boundaries hold

Given: standard.
When:
1. Sign in as volunteer — expect the nav to omit "Leases" and "Classes".
2. Type `/leases` into the address bar — expect a page headed "Not
   authorized", not the lease list.
3. Sign out, sign in as instructor, type `/donations` into the address
   bar — expect "Not authorized".
4. Sign out, sign in as staff, open `/families` — expect no field labeled
   SSN, Social Security, bank, or income anywhere on the page.
Evidence: a screenshot after each numbered step.

## Q31 (W6): fresh clone is explorable

Given: fresh clone; `npm ci && npx playwright install chromium`;
`npm run build`; `EWURK_DB_PATH=data/qa-w6.db PORT=3501 npm run seed`;
`EWURK_DB_PATH=data/qa-w6.db PORT=3501 npm start`.
When:
1. Sign in as staff at `http://localhost:3501` and open `/devices` —
   expect at least 5 devices with serials starting `SN-SEED-`, spanning
   at least 4 distinct statuses, with no manual data entry performed.
2. Open `/families`, search "Herrera Family" and "Osei Family" — expect
   both to exist with an active lease each.
3. Open the seeded device that was swapped — expect a visible
   "replaces"/"replaced by" link to its counterpart.
4. `head -3 LICENSE` — expect "GNU GENERAL PUBLIC LICENSE" / "Version 3".
Evidence: a screenshot after each numbered step; the `head` output.

```json qa
{ "scenarios": [
    { "id": "Q1", "requirement": "R1" },
    { "id": "Q2", "requirement": "R2" },
    { "id": "Q3", "requirement": "R3" },
    { "id": "Q4", "requirement": "R4" },
    { "id": "Q5", "requirement": "R5" },
    { "id": "Q6", "requirement": "R6" },
    { "id": "Q7", "requirement": "R7" },
    { "id": "Q8", "requirement": "R8" },
    { "id": "Q9", "requirement": "R9" },
    { "id": "Q10", "requirement": "R10" },
    { "id": "Q11", "requirement": "R11" },
    { "id": "Q12", "requirement": "R12" },
    { "id": "Q13", "requirement": "R13" },
    { "id": "Q14", "requirement": "R14" },
    { "id": "Q15", "requirement": "R15" },
    { "id": "Q16", "requirement": "R16" },
    { "id": "Q17", "requirement": "R17" },
    { "id": "Q18", "requirement": "R18" },
    { "id": "Q19", "requirement": "R19" },
    { "id": "Q20", "requirement": "R20" },
    { "id": "Q21", "requirement": "R21" },
    { "id": "Q22", "requirement": "R22" },
    { "id": "Q23", "requirement": "R23" },
    { "id": "Q24", "requirement": "R24" },
    { "id": "Q25", "requirement": "R25" },
    { "id": "Q26", "requirement": "W1" },
    { "id": "Q27", "requirement": "W2" },
    { "id": "Q28", "requirement": "W3" },
    { "id": "Q29", "requirement": "W4" },
    { "id": "Q30", "requirement": "W5" },
    { "id": "Q31", "requirement": "W6" }
  ] }
```
