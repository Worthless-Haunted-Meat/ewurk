import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { DatabaseSync } from 'node:sqlite';
import { AppError } from '../src/http/errors.js';
import { openDb } from '../src/db/connection.js';
import { buildDepsFromDb, isDevOutboxEnabled } from '../src/server.js';
import { addUser } from '../src/cli/addUser.js';
import type { AppDeps } from '../src/deps.js';
import type { Device } from '../src/domain/types.js';

// Real services over an in-memory database: these rules span the device,
// lease, and payment services, so fakes would hide exactly what they test.

const WIPE = { wipeMethod: 'NIST SP 800-88 Clear', wipeDate: '2026-01-01', wipeOperator: 'tester' };

function isCode(code: string) {
  return (err: unknown) => err instanceof AppError && err.code === code;
}

let db: DatabaseSync;
let deps: AppDeps;
let serial = 0;

function availableDevice(): Device {
  const donation = deps.donationService.createDonation({ donorOrg: "St. Anne's Parish", pickupDate: '2026-01-01' });
  const device = deps.donationService.receiveItem(donation.id, { model: 'Latitude 5490', serial: `SN-INT-${++serial}` }, 'tester');
  for (const to of ['triaged', 'wiped', 'refurbished', 'imaged', 'available'] as const) {
    deps.deviceService.transitionDevice(device.id, to, 'tester', to === 'wiped' ? WIPE : undefined);
  }
  return deps.deviceService.getById(device.id)!;
}

function family(name = 'Herrera Family') {
  return deps.familyService.createFamily({ name, contact: '555-0100' });
}

beforeEach(() => {
  db = openDb(':memory:');
  deps = buildDepsFromDb(db);
});

describe('a device goes back through a wipe before its next family', () => {
  test('a swapped-out device must be re-wiped: repair leads only to wiped or retired', () => {
    const outgoing = availableDevice();
    const incoming = availableDevice();
    const lease = deps.leaseService.createLease(family().id, outgoing.assetTag, 'tester');
    deps.leaseService.swap(lease.id, incoming.assetTag, 'tester');

    assert.throws(() => deps.deviceService.transitionDevice(outgoing.id, 'refurbished', 'tester'), isCode('INVALID_TRANSITION'));
    for (const to of ['wiped', 'refurbished', 'imaged', 'available'] as const) {
      deps.deviceService.transitionDevice(outgoing.id, to, 'tester', to === 'wiped' ? WIPE : undefined);
    }
    assert.equal(deps.deviceService.getById(outgoing.id)?.status, 'available');
  });

  test('a wipe recorded before the last lease does not satisfy the gate', () => {
    const device = availableDevice();
    deps.leaseService.createLease(family().id, device.assetTag, 'tester');
    // Bypass the graph, as the existing R6 test does, to prove the gate itself.
    db.prepare("UPDATE devices SET status = 'imaged' WHERE id = ?").run(device.id);
    assert.throws(() => deps.deviceService.transitionDevice(device.id, 'available', 'tester'), isCode('WIPE_REQUIRED'));
  });
});

describe('only the lease moves a device into or out of leased', () => {
  test('manual transitions into or out of leased are refused with LEASE_MANAGED', () => {
    const inStock = availableDevice();
    assert.throws(() => deps.deviceService.transitionDevice(inStock.id, 'leased', 'volunteer'), isCode('LEASE_MANAGED'));

    const leased = availableDevice();
    deps.leaseService.createLease(family().id, leased.assetTag, 'tester');
    assert.throws(() => deps.deviceService.transitionDevice(leased.id, 'returned', 'volunteer'), isCode('LEASE_MANAGED'));
    assert.throws(() => deps.deviceService.transitionDevice(leased.id, 'repair', 'volunteer'), isCode('LEASE_MANAGED'));
    assert.equal(deps.deviceService.getById(leased.id)?.status, 'leased');
  });

  test('endLease returns the device, closes custody, ends the lease, and frees the family for a new lease', () => {
    const device = availableDevice();
    const herrera = family();
    const lease = deps.leaseService.createLease(herrera.id, device.assetTag, 'tester');

    const ended = deps.leaseService.endLease(lease.id, 'tester');

    assert.equal(ended.status, 'ended');
    assert.equal(deps.deviceService.getById(device.id)?.status, 'returned');
    assert.equal(deps.leaseService.getCurrentDevice(lease.id), null);
    assert.ok(deps.leaseService.getCustodyChain(lease.id).every((c) => c.endedAt !== null));
    assert.throws(() => deps.leaseService.endLease(lease.id, 'tester'), isCode('VALIDATION'));
    assert.doesNotThrow(() => deps.leaseService.createLease(herrera.id, availableDevice().assetTag, 'tester'));
  });
});

describe('a refused swap changes nothing', () => {
  test('an incoming device that is not available is refused before any device moves', () => {
    const outgoing = availableDevice();
    const lease = deps.leaseService.createLease(family().id, outgoing.assetTag, 'tester');
    const notReady = availableDevice();
    deps.leaseService.createLease(family('Osei Family').id, notReady.assetTag, 'tester');

    assert.throws(() => deps.leaseService.swap(lease.id, notReady.assetTag, 'tester'), isCode('DEVICE_NOT_AVAILABLE'));
    assert.throws(() => deps.leaseService.swap(lease.id, outgoing.assetTag, 'tester'), isCode('DEVICE_NOT_AVAILABLE'));
    assert.equal(deps.deviceService.getById(outgoing.id)?.status, 'leased');
    assert.equal(deps.leaseService.getCurrentDevice(lease.id)?.id, outgoing.id);
  });

  test('an ended lease cannot be swapped', () => {
    const device = availableDevice();
    const lease = deps.leaseService.createLease(family().id, device.assetTag, 'tester');
    deps.leaseService.endLease(lease.id, 'tester');
    assert.throws(() => deps.leaseService.swap(lease.id, availableDevice().assetTag, 'tester'), isCode('VALIDATION'));
  });
});

describe('foreign keys are enforced on the shared connection', () => {
  test('attendance for a family that does not exist is rejected', () => {
    const session = deps.classService.createSession('2026-01-10', 'Intro to Linux');
    assert.throws(() => deps.classes.markAttendance(session.id, 9999, true));
    assert.equal((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys, 1);
  });
});

describe('payments are whole cents on real dates', () => {
  test('fractional cents, zero, and impossible dates are refused; a normal payment is recorded', () => {
    const lease = deps.leaseService.createLease(family().id, availableDevice().assetTag, 'tester');
    assert.throws(() => deps.paymentService.recordPayment(lease.id, 0.4, '2026-01-05'), isCode('VALIDATION'));
    assert.throws(() => deps.paymentService.recordPayment(lease.id, 0, '2026-01-05'), isCode('VALIDATION'));
    assert.throws(() => deps.paymentService.recordPayment(lease.id, 2000, 'garbage'), isCode('VALIDATION'));
    assert.throws(() => deps.paymentService.recordPayment(lease.id, 2000, '2026-02-30'), isCode('VALIDATION'));
    assert.equal(deps.paymentService.recordPayment(lease.id, 2000, '2026-01-05').amountCents, 2000);
  });
});

describe('the dev outbox is opt-in', () => {
  test('it is off unless EWURK_DEV_OUTBOX is on, and never in production', () => {
    assert.equal(isDevOutboxEnabled({ NODE_ENV: 'development' }), false);
    assert.equal(isDevOutboxEnabled({ NODE_ENV: 'development', EWURK_DEV_OUTBOX: 'false' }), false);
    assert.equal(isDevOutboxEnabled({ NODE_ENV: 'development', EWURK_DEV_OUTBOX: 'true' }), true);
    assert.equal(isDevOutboxEnabled({ EWURK_DEV_OUTBOX: '1' }), true);
    assert.equal(isDevOutboxEnabled({ NODE_ENV: 'production', EWURK_DEV_OUTBOX: 'true' }), false);
  });
});

describe('user:add creates the first real accounts', () => {
  test('stores the email lowercase, and sign-in finds it regardless of case', () => {
    const user = addUser(db, { email: '  Ricky@WorthlessHauntedMeat.org ', name: 'Ricky Vega', role: 'staff' });
    assert.equal(user.email, 'ricky@worthlesshauntedmeat.org');
    assert.equal(deps.users.findByEmail('ricky@worthlesshauntedmeat.org')?.role, 'staff');

    deps.authService.requestMagicLink('RICKY@worthlesshauntedmeat.org');
    assert.ok(deps.mailer.list().some((m) => m.to === 'ricky@worthlesshauntedmeat.org'));
  });

  test('refuses duplicates, unknown roles, and non-emails', () => {
    addUser(db, { email: 'staff@org.org', name: 'Staff', role: 'staff' });
    assert.throws(() => addUser(db, { email: 'STAFF@org.org', name: 'Again', role: 'staff' }), /already exists/);
    assert.throws(() => addUser(db, { email: 'x@org.org', name: 'X', role: 'admin' }), /Role must be one of/);
    assert.throws(() => addUser(db, { email: 'not-an-email', name: 'X', role: 'staff' }), /Not an email/);
  });
});
