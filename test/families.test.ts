import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/http/errors.js';
import { FamilyService } from '../src/services/familyService.js';
import { PaymentService } from '../src/services/leaseService.js';
import { openDb } from '../src/db/connection.js';
import { SqliteFamilyStore } from '../src/adapters/sqlite/familyClassAdapters.js';
import {
  FakeFamilyStore,
  FakeLeaseStore,
  FakePaymentStore,
  FakeDeviceStore,
  FakeDeviceLifecycle,
  FakeClassStore,
  FakeClock,
  buildFakeDeps,
  seedUsers,
  loginAs,
  startTestServer,
  type TestServer,
  type FakeBag,
} from './helpers/testApp.js';
import type { DatabaseSync } from 'node:sqlite';
import type { User } from '../src/domain/types.js';

describe('[R19][R22] FamilyService (fake ports)', () => {
  function harness() {
    const families = new FakeFamilyStore();
    const leases = new FakeLeaseStore();
    const devices = new FakeDeviceStore();
    const payments = new FakePaymentStore();
    const classes = new FakeClassStore();
    const clock = new FakeClock();
    const deviceLifecycle = new FakeDeviceLifecycle(devices);
    const paymentService = new PaymentService(payments, leases, clock);
    const service = new FamilyService(families, leases, deviceLifecycle, paymentService, classes, clock);
    return { families, leases, devices, payments, classes, clock, paymentService, service };
  }

  test('[R22] createFamily only ever persists name/contact/neighborhood', () => {
    const { families, service } = harness();
    const family = service.createFamily({ name: 'Herrera Family', contact: '555-0100', neighborhood: 'Westside' });
    assert.equal(family.name, 'Herrera Family');
    assert.equal(Object.keys(families.rows[0]!).sort().join(','), 'contact,createdAt,id,name,neighborhood');
  });

  test('[R19] getSummary on a family with no lease has null device/payment and empty attendance', () => {
    const { families, service } = harness();
    const family = families.create({ name: 'No Lease Family', contact: '555-0900' });
    const summary = service.getSummary(family.id);
    assert.equal(summary.activeLease, null);
    assert.equal(summary.currentDevice, null);
    assert.equal(summary.paymentStatus, null);
    assert.deepEqual(summary.attendance, []);
  });

  test('[R19] getSummary on a missing family throws NOT_FOUND', () => {
    const { service } = harness();
    assert.throws(
      () => service.getSummary(9999),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });

  test('[R19] getSummary on a leased, paid, enrolled family returns device + wipe + payment + attendance in one call', () => {
    const { families, leases, devices, classes, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    devices.updateStatus(device.id, 'available', {
      wipeMethod: 'NIST SP 800-88 Clear',
      wipeDate: '2026-01-10',
      wipeOperator: 'Tech One',
    });
    const lease = leases.create({ familyId: family.id, startDate: '2026-01-15' });
    leases.addCustody(lease.id, device.id, '2026-01-15');
    devices.updateStatus(device.id, 'leased');
    const session = classes.createSession({ sessionDate: '2026-01-24', topic: 'Intro to Linux' });
    classes.upsertAttendance(session.id, family.id, true);

    const summary = service.getSummary(family.id);
    assert.equal(summary.activeLease?.id, lease.id);
    assert.equal(summary.currentDevice?.assetTag, device.assetTag);
    assert.equal(summary.currentDevice?.wipeMethod, 'NIST SP 800-88 Clear');
    assert.ok(summary.paymentStatus);
    assert.equal(summary.attendance.length, 1);
    assert.equal(summary.attendance[0]!.present, true);
  });
});

describe('[R22] SqliteFamilyStore (real, :memory:)', () => {
  let db: DatabaseSync;

  before(() => {
    db = openDb(':memory:');
  });

  test('[R22] create / getById / search / list, no ssn/bank/income column exists', () => {
    const store = new SqliteFamilyStore(db);
    const family = store.create({ name: 'Herrera Family', contact: '555-0100', neighborhood: 'Westside' });
    assert.equal(store.getById(family.id)?.name, 'Herrera Family');
    assert.equal(store.search('herrera').length, 1);
    assert.equal(store.search('nomatch').length, 0);
    assert.ok(store.list().length >= 1);

    const columns = db.prepare('PRAGMA table_info(families)').all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    assert.ok(!names.includes('ssn'));
    assert.ok(!names.some((n) => n.includes('bank')));
    assert.ok(!names.some((n) => n.includes('income')));
  });
});

describe('[R19][R22] family routes (wired app, fakes)', () => {
  let bag: FakeBag;
  let server: TestServer;
  let staff: User;

  before(async () => {
    bag = buildFakeDeps();
    ({ staff } = seedUsers(bag));
    server = await startTestServer(bag.deps);
  });

  after(async () => {
    await server.close();
  });

  test('[R22] the new-family page has no SSN/bank/income field', async () => {
    const cookie = loginAs(bag, staff);
    const res = await fetch(`${server.baseUrl}/families`, { headers: { cookie } });
    const text = await res.text();
    assert.doesNotMatch(text, /ssn/i);
    assert.doesNotMatch(text, /social security/i);
    assert.doesNotMatch(text, /bank/i);
    assert.doesNotMatch(text, /income/i);
  });

  test('[R22] POST /api/families ignores an ssn field even if sent', async () => {
    const cookie = loginAs(bag, staff);
    const res = await fetch(`${server.baseUrl}/api/families`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Family', contact: '555-0000', ssn: '123-45-6789' }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal('ssn' in body, false);
  });

  test('[R19] the family page shows device, wipe record, payment status, and attendance on one page', async () => {
    const cookie = loginAs(bag, staff);
    const family = bag.families.create({ name: 'Herrera Family', contact: '555-0100' });
    const device = bag.devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-R19' });
    bag.devices.updateStatus(device.id, 'available');
    bag.devices.getById(device.id)!.wipeMethod = 'NIST SP 800-88 Clear';
    bag.devices.getById(device.id)!.wipeDate = '2026-01-10';
    bag.devices.getById(device.id)!.wipeOperator = 'Tech One';
    bag.deps.leaseService.createLease(family.id, device.assetTag, 'tester');
    const session = bag.classes.createSession({ sessionDate: '2026-01-24', topic: 'Intro to Linux' });
    bag.classes.upsertAttendance(session.id, family.id, true);

    const res = await fetch(`${server.baseUrl}/families/${family.id}`, { headers: { cookie } });
    const text = await res.text();
    assert.match(text, new RegExp(device.assetTag));
    assert.match(text, /NIST SP 800-88 Clear/);
    assert.match(text, /Intro to Linux/);
  });
});
