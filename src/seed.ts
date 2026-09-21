import type { DatabaseSync } from 'node:sqlite';
import type { AppDeps } from './deps.js';
import { buildDeps } from './server.js';

/**
 * STUB — implemented by T6. Real implementation notes (R23). Every
 * literal below is exact and load-bearing: test/seed.test.ts and
 * test/e2e/w6.fresh-clone.spec.ts identify seeded rows by these exact
 * strings (serial prefix `SN-SEED-`, family names `Herrera Family` /
 * `Osei Family`) so they keep working even after other tests add their
 * own unrelated data to the same database. Do not paraphrase them.
 *
 * Using the real services on `deps` plus raw SQL on `db` (there is no
 * "create user" use case in v1 — `UserStore` is read-only — so seed three
 * users directly). Exactly five devices total, satisfying R23's "five
 * devices across different lifecycle stages, two leases, and one swap"
 * precisely (no extra devices needed):
 *
 * 1. `db.prepare('INSERT OR IGNORE INTO users (email, name, role, created_at) VALUES (?,?,?,?)').run(...)`
 *    for: staff@ewurk.org / "Staff One" / staff, volunteer@ewurk.org /
 *    "Vera Volunteer" / volunteer, instructor@ewurk.org / "Ivan Instructor" / instructor
 *    (created_at = new Date().toISOString()).
 * 2. `deps.donationService.createDonation({donorOrg: "St. Anne's Parish", pickupDate: today})`.
 * 3. `deps.donationService.receiveItem(donation.id, {model: 'Dell Latitude 5490', serial}, 'seed')`
 *    five times, with `serial` exactly `SN-SEED-0001`, `SN-SEED-0002`,
 *    `SN-SEED-0003`, `SN-SEED-0004`, `SN-SEED-0005` in that order,
 *    producing devices EW-0001..EW-0005 in the same order (asset tags are
 *    minted sequentially by SqliteDeviceStore.create — do not assume they
 *    are exactly "EW-0001" if other tests ran first against the same
 *    fresh db; capture the returned Device's `assetTag` from each
 *    `receiveItem` call instead of hardcoding it).
 * 4. Drive devices to different lifecycle stages via
 *    `deps.deviceService.transitionDevice`, always through the one gate:
 *    - device 1 (SN-SEED-0001) stays 'received'.
 *    - device 2 (SN-SEED-0002) -> 'triaged'.
 *    - devices 3, 4, 5 (SN-SEED-0003/4/5) each go 'triaged' -> 'wiped'
 *      (method 'NIST SP 800-88 Clear', date=today, operator='seed') ->
 *      'refurbished' -> 'imaged' -> 'available'.
 *    Result so far: statuses {received, triaged, available x3} — 3
 *    distinct statuses; step 7's swap adds a 4th (repair).
 * 5. `deps.familyService.createFamily({name: 'Herrera Family', contact: '555-0100', neighborhood: 'Westside'})`
 *    and `deps.familyService.createFamily({name: 'Osei Family', contact: '555-0200', neighborhood: 'Eastside'})`
 *    — these exact names.
 * 6. `deps.leaseService.createLease(herrera.id, device4.assetTag, 'seed')`
 *    and `deps.leaseService.createLease(osei.id, device5.assetTag, 'seed')`
 *    — two leases, leaving device 3 as the only still-'available' spare.
 * 7. `deps.leaseService.swap(herreraLease.id, device3.assetTag, 'seed')` —
 *    one swap; device 4 moves to 'repair' (replaced by device 3), device 3
 *    becomes Herrera's leased device. Final statuses: device1 received,
 *    device2 triaged, device3 leased, device4 repair, device5 leased — 4
 *    distinct statuses across exactly 5 devices, 2 leases, 1 swap.
 * 8. `deps.paymentService.recordPayment(oseiLease.id, 2000, today)` so a
 *    non-zero payment history exists on at least one lease.
 * 9. `deps.classService.createSession(today, 'Intro to Linux')`, then
 *    `deps.classService.buildRoster(session.id)`.
 * Log a one-line summary (`console.log`) of what was created and return.
 */
export function seed(_deps: AppDeps, _db: DatabaseSync): void {
  throw new Error('not implemented: seed');
}

function main(): void {
  const { deps, db } = buildDeps();
  seed(deps, db);
}

main();
