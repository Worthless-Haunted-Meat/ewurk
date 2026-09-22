import type { DatabaseSync } from 'node:sqlite';
import type { AppDeps } from './deps.js';
import { buildDeps } from './server.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Seeds the demo dataset (R23): one donation with 5 items, five devices
 * across 4+ lifecycle stages, two families with leases, one swap,
 * three users (staff/volunteer/instructor), one sample payment, one
 * class session — all with exact literals that the test suite identifies
 * by (serial prefix `SN-SEED-`, family names `Herrera Family` /
 * `Osei Family`).
 *
 * Uses real services on `deps` for everything that has a service method;
 * only `UserStore` is read-only in v1 so users are INSERTed directly.
 */
export function seed(deps: AppDeps, db: DatabaseSync): void {
  const today = deps.clock.todayISO();

  // Clean previously seeded data so seed is idempotent.
  // Order matters: respect FK constraints (delete children before parents).
  db.exec('DELETE FROM attendance');
  db.exec('DELETE FROM payments');
  db.exec('DELETE FROM lease_devices');
  db.exec('DELETE FROM device_events');
  db.exec('DELETE FROM leases');
  db.exec('DELETE FROM devices');
  db.exec('DELETE FROM donations');
  db.exec("DELETE FROM users WHERE email IN ('staff@ewurk.org','volunteer@ewurk.org','instructor@ewurk.org')");

  // 1. Seed three users via raw SQL (UserStore is read-only in v1).
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (email, name, role, created_at) VALUES (?,?,?,?)',
  );
  insertUser.run('staff@ewurk.org', 'Staff One', 'staff', new Date().toISOString());
  insertUser.run('volunteer@ewurk.org', 'Vera Volunteer', 'volunteer', new Date().toISOString());
  insertUser.run('instructor@ewurk.org', 'Ivan Instructor', 'instructor', new Date().toISOString());

  // 2. Create one donation.
  const donation = deps.donationService.createDonation({
    donorOrg: "St. Anne's Parish",
    pickupDate: today,
  });

  // 3. Receive five items; capture returned asset tags.
  const models = [
    'Dell Latitude 5490',
    'Lenovo ThinkPad T480',
    'HP EliteBook 840 G5',
    'Dell Latitude 7490',
    'Lenovo ThinkPad X1 Carbon',
  ];
  const devices: Array<{ serial: string; assetTag: string }> = [];
  for (let i = 0; i < 5; i++) {
    const serial = `SN-SEED-${String(i + 1).padStart(4, '0')}`;
    const dev = deps.donationService.receiveItem(donation.id, { model: models[i]!, serial }, 'seed');
    devices.push({ serial, assetTag: dev.assetTag });
  }

  // 4. Drive devices through lifecycle stages (device 1 stays 'received').
  const dev2Id = db.prepare('SELECT id FROM devices WHERE serial = ?').get('SN-SEED-0002') as { id: number };
  const dev3Id = db.prepare('SELECT id FROM devices WHERE serial = ?').get('SN-SEED-0003') as { id: number };
  const dev4Id = db.prepare('SELECT id FROM devices WHERE serial = ?').get('SN-SEED-0004') as { id: number };
  const dev5Id = db.prepare('SELECT id FROM devices WHERE serial = ?').get('SN-SEED-0005') as { id: number };

  // Device 2: received -> triaged
  deps.deviceService.transitionDevice(dev2Id.id, 'triaged', 'seed');

  // Devices 3, 4, 5: triaged -> wiped -> refurbished -> imaged -> available
  for (const devId of [dev3Id.id, dev4Id.id, dev5Id.id]) {
    deps.deviceService.transitionDevice(devId, 'triaged', 'seed');
    deps.deviceService.transitionDevice(devId, 'wiped', 'seed', {
      wipeMethod: "NIST SP 800-88 Clear",
      wipeDate: today,
      wipeOperator: 'seed',
    });
    deps.deviceService.transitionDevice(devId, 'refurbished', 'seed');
    deps.deviceService.transitionDevice(devId, 'imaged', 'seed');
    deps.deviceService.transitionDevice(devId, 'available', 'seed');
  }

  // 5. Create two families.
  const herrera = deps.familyService.createFamily({
    name: 'Herrera Family',
    contact: '555-0100',
    neighborhood: 'Westside',
  });
  const osei = deps.familyService.createFamily({
    name: 'Osei Family',
    contact: '555-0200',
    neighborhood: 'Eastside',
  });

  // 6. Create two leases (herrera->device4, osei->device5).
  const herreraLease = deps.leaseService.createLease(herrera.id, devices[3]!.assetTag, 'seed');
  const oseiLease = deps.leaseService.createLease(osei.id, devices[4]!.assetTag, 'seed');

  // 7. Swap: device3 replaces device4 for Herrera's lease.
  deps.leaseService.swap(herreraLease.id, devices[2]!.assetTag, 'seed');

  // 8. Record one payment on Osei's lease.
  deps.paymentService.recordPayment(oseiLease.id, 2000, today);

  // 9. Create one class session and build roster.
  const session = deps.classService.createSession(today, 'Intro to Linux');
  deps.classService.buildRoster(session.id);

  // Summary log.
  console.warn(`seed: 3 users, 1 donation, 5 devices, 2 families, 2 leases, 1 swap, 1 payment, 1 class`);
}

function main(): void {
  const { deps, db } = buildDeps();
  seed(deps, db);
}

// Only run main when this file is the CLI entry point.
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main();
}
