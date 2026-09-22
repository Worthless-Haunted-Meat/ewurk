import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/http/errors.js';
import { LeaseService, PaymentService } from '../src/services/leaseService.js';
import { openDb } from '../src/db/connection.js';
import { SqliteLeaseStore, SqlitePaymentStore } from '../src/adapters/sqlite/leasePaymentAdapters.js';
import {
  FakeLeaseStore,
  FakePaymentStore,
  FakeFamilyStore,
  FakeDeviceStore,
  FakeDeviceLifecycle,
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

function makeAvailableDevice(devices: FakeDeviceStore, serial: string) {
  const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial });
  devices.updateStatus(device.id, 'available');
  return device;
}

describe('[R9][R10][R11] LeaseService (fake ports)', () => {
  function harness() {
    const leases = new FakeLeaseStore();
    const devices = new FakeDeviceStore();
    const families = new FakeFamilyStore();
    const clock = new FakeClock();
    const deviceLifecycle = new FakeDeviceLifecycle(devices);
    const service = new LeaseService(leases, deviceLifecycle, families, clock);
    return { leases, devices, families, clock, service };
  }

  test('[R9] createLease leases an available device to a family and records custody', () => {
    const { devices, families, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const device = makeAvailableDevice(devices, 'SN-1');
    const lease = service.createLease(family.id, device.assetTag, 'tester');
    assert.equal(lease.familyId, family.id);
    assert.equal(devices.getById(device.id)?.status, 'leased');
    assert.equal(service.getCurrentDevice(lease.id)?.assetTag, device.assetTag);
  });

  test('[R9] createLease rejects a second concurrent lease for the same family', () => {
    const { devices, families, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const d1 = makeAvailableDevice(devices, 'SN-1');
    const d2 = makeAvailableDevice(devices, 'SN-2');
    service.createLease(family.id, d1.assetTag, 'tester');
    assert.throws(
      () => service.createLease(family.id, d2.assetTag, 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'DUPLICATE_ACTIVE_LEASE',
    );
  });

  test('[R9] createLease rejects a device that is not available', () => {
    const { devices, families, service } = harness();
    const family = families.create({ name: 'Osei Family', contact: '555-0200' });
    const device = devices.create({ donationId: 1, model: 'Dell', serial: 'SN-NOT-AVAIL' }); // still 'received'
    assert.throws(
      () => service.createLease(family.id, device.assetTag, 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'DEVICE_NOT_AVAILABLE',
    );
  });

  test('[R9] createLease rejects an unknown family or device', () => {
    const { devices, families, service } = harness();
    const device = makeAvailableDevice(devices, 'SN-3');
    assert.throws(
      () => service.createLease(9999, device.assetTag, 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
    const family = families.create({ name: 'Third Family', contact: '555-0300' });
    assert.throws(
      () => service.createLease(family.id, 'EW-9999', 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });

  test('[R10] swap moves the outgoing device to repair, the incoming device to leased, and keeps the lease unchanged', () => {
    const { devices, families, leases, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const outgoing = makeAvailableDevice(devices, 'SN-OUT');
    const incoming = makeAvailableDevice(devices, 'SN-IN');
    const lease = service.createLease(family.id, outgoing.assetTag, 'tester');
    const startDateBefore = leases.getById(lease.id)!.startDate;

    const afterSwap = service.swap(lease.id, incoming.assetTag, 'tester');
    assert.equal(afterSwap.startDate, startDateBefore);
    assert.equal(afterSwap.status, 'active');
    assert.equal(devices.getById(outgoing.id)?.status, 'repair');
    assert.equal(devices.getById(incoming.id)?.status, 'leased');
    assert.equal(devices.getById(incoming.id)?.replacesDeviceId, outgoing.id);
    assert.equal(devices.getById(outgoing.id)?.replacedByDeviceId, incoming.id);
  });

  test('[R10] swap rejects a replacement device that is not available', () => {
    const { devices, families, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const outgoing = makeAvailableDevice(devices, 'SN-OUT2');
    const notAvailable = devices.create({ donationId: 1, model: 'Dell', serial: 'SN-NOTAVAIL2' });
    const lease = service.createLease(family.id, outgoing.assetTag, 'tester');
    assert.throws(
      () => service.swap(lease.id, notAvailable.assetTag, 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'DEVICE_NOT_AVAILABLE',
    );
  });

  test('[R11] getCustodyChain lists every device the lease has ever held, in order, with dates', () => {
    const { devices, families, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const outgoing = makeAvailableDevice(devices, 'SN-C1');
    const incoming = makeAvailableDevice(devices, 'SN-C2');
    const lease = service.createLease(family.id, outgoing.assetTag, 'tester');
    service.swap(lease.id, incoming.assetTag, 'tester');
    const chain = service.getCustodyChain(lease.id);
    assert.equal(chain.length, 2);
    assert.equal(chain[0]!.assetTag, outgoing.assetTag);
    assert.ok(chain[0]!.endedAt, 'the first custody entry should be closed out by the swap');
    assert.equal(chain[1]!.assetTag, incoming.assetTag);
    assert.equal(chain[1]!.endedAt, null);
  });
});

describe('[R12][R13][R14][R15] PaymentService (fake ports)', () => {
  function harness(todayISO = '2026-03-15') {
    const leases = new FakeLeaseStore();
    const payments = new FakePaymentStore();
    const clock = new FakeClock(`${todayISO}T09:00:00.000Z`);
    const service = new PaymentService(payments, leases, clock);
    const lease = leases.create({ familyId: 1, startDate: '2026-01-01' });
    return { leases, payments, clock, service, lease };
  }

  test('[R12] recordPayment adds to the ledger', () => {
    const { payments, service, lease } = harness();
    service.recordPayment(lease.id, 2000, '2026-01-01');
    assert.equal(payments.listByLease(lease.id).length, 1);
  });

  test('[R12] recordPayment rejects a non-positive amount', () => {
    const { service, lease } = harness();
    assert.throws(
      () => service.recordPayment(lease.id, 0, '2026-01-01'),
      (err: unknown) => err instanceof AppError && err.code === 'VALIDATION',
    );
  });

  test('[R13] a lease with no payments since its start is behind', () => {
    const { service, lease } = harness('2026-03-15'); // lease started 2026-01-01, ~2.5 months ago
    const status = service.getStatus(lease.id);
    assert.equal(status.status, 'behind');
  });

  test('[R13] a lease paid through today or later is current', () => {
    const { service, lease } = harness('2026-01-10');
    service.recordPayment(lease.id, 2000, '2026-01-01'); // covers through 2026-02-01
    const status = service.getStatus(lease.id);
    assert.equal(status.status, 'current');
  });

  test('[R14] hardship pause reports "paused" instead of "behind" and does not end the lease', () => {
    const { leases, service, lease } = harness('2026-03-15');
    service.setHardshipPause(lease.id, true);
    const status = service.getStatus(lease.id);
    assert.equal(status.status, 'paused');
    assert.equal(leases.getById(lease.id)?.status, 'active');
  });

  test('[R15] getStatus never returns anything but a label — it has no side effect on the lease or a device', () => {
    const { leases, service, lease } = harness('2026-03-15');
    const before = JSON.stringify(leases.getById(lease.id));
    service.getStatus(lease.id);
    const after = JSON.stringify(leases.getById(lease.id));
    assert.equal(before, after);
  });

  test('[R12][R13] getStatus / setHardshipPause / recordPayment on a missing lease throw NOT_FOUND', () => {
    const { service } = harness();
    assert.throws(() => service.getStatus(9999), (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND');
    assert.throws(() => service.setHardshipPause(9999, true), (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND');
    assert.throws(
      () => service.recordPayment(9999, 2000, '2026-01-01'),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });
});

describe('[R9][R10][R11][R12][R13][R14] sqlite lease/payment adapters (real, :memory:)', () => {
  let db: DatabaseSync;
  let familyId: number;

  before(() => {
    db = openDb(':memory:');
    db.prepare("INSERT INTO families (name, contact, neighborhood, created_at) VALUES ('Herrera Family', '555-0100', NULL, datetime('now'))").run();
    familyId = 1;
  });

  test('[R9] LeaseStore create / getById / findActiveByFamily / listAll', () => {
    const store = new SqliteLeaseStore(db);
    const lease = store.create({ familyId, startDate: '2026-01-01' });
    assert.equal(store.getById(lease.id)?.familyId, familyId);
    assert.equal(store.findActiveByFamily(familyId)?.id, lease.id);
    assert.ok(store.listAll().length >= 1);
  });

  test('[R10][R11] LeaseStore addCustody / endCustody / listCustody / getCurrentDeviceId', () => {
    const store = new SqliteLeaseStore(db);
    const lease = store.create({ familyId, startDate: '2026-01-02' });
    store.addCustody(lease.id, 1, '2026-01-02');
    assert.equal(store.getCurrentDeviceId(lease.id), 1);
    store.endCustody(lease.id, 1, '2026-02-01');
    store.addCustody(lease.id, 2, '2026-02-01');
    assert.equal(store.getCurrentDeviceId(lease.id), 2);
    assert.equal(store.listCustody(lease.id).length, 2);
  });

  test('[R14] LeaseStore.setHardshipPaused persists the flag', () => {
    const store = new SqliteLeaseStore(db);
    const lease = store.create({ familyId, startDate: '2026-01-03' });
    const updated = store.setHardshipPaused(lease.id, true);
    assert.equal(updated.hardshipPaused, true);
    assert.equal(store.getById(lease.id)?.hardshipPaused, true);
  });

  test('[R12] PaymentStore record / listByLease', () => {
    const leaseStore = new SqliteLeaseStore(db);
    const paymentStore = new SqlitePaymentStore(db);
    const lease = leaseStore.create({ familyId, startDate: '2026-01-04' });
    paymentStore.record({ leaseId: lease.id, amountCents: 2000, paidDate: '2026-01-04' });
    assert.equal(paymentStore.listByLease(lease.id).length, 1);
  });
});

describe('[R9][R10][R12][R13][R14][R15] lease routes (wired app, fakes)', () => {
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

  test('[R9] POST /api/leases creates a lease and leases the device', async () => {
    const cookie = loginAs(bag, staff);
    const family = bag.families.create({ name: 'Herrera Family', contact: '555-0100' });
    const device = makeAvailableDevice(bag.devices, 'SN-ROUTE-1');

    const res = await fetch(`${server.baseUrl}/api/leases`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ familyId: family.id, assetTag: device.assetTag }),
    });
    assert.equal(res.status, 201);
    assert.equal(bag.devices.getById(device.id)?.status, 'leased');
  });

  test('[R10] POST /leases/:id/swap keeps the lease and swaps the device', async () => {
    const cookie = loginAs(bag, staff);
    const family = bag.families.create({ name: 'Osei Family', contact: '555-0200' });
    const outgoing = makeAvailableDevice(bag.devices, 'SN-ROUTE-OUT');
    const incoming = makeAvailableDevice(bag.devices, 'SN-ROUTE-IN');
    const lease = bag.deps.leaseService.createLease(family.id, outgoing.assetTag, 'tester');

    const res = await fetch(`${server.baseUrl}/leases/${lease.id}/swap`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ newAssetTag: incoming.assetTag }),
      redirect: 'manual',
    });
    assert.equal(res.status, 302);
    assert.equal(bag.devices.getById(outgoing.id)?.status, 'repair');
    assert.equal(bag.devices.getById(incoming.id)?.status, 'leased');
  });

  test('[R12][R13] recording a payment moves a lease from behind to current on the lease page', async () => {
    const cookie = loginAs(bag, staff);
    const family = bag.families.create({ name: 'Third Family', contact: '555-0300' });
    const device = makeAvailableDevice(bag.devices, 'SN-ROUTE-PAY');
    // Lease starts at the fake clock's default date, 2026-01-15.
    const lease = bag.deps.leaseService.createLease(family.id, device.assetTag, 'tester');
    // A few weeks later, with zero payments recorded, the lease is behind.
    bag.clock.set('2026-02-10T09:00:00.000Z');

    const before = await fetch(`${server.baseUrl}/leases/${lease.id}`, { headers: { cookie } });
    assert.match(await before.text(), /behind/);

    // One $20 payment covers the first month (paid-through 2026-02-15),
    // which is on/after "today" (2026-02-10), so the lease reads current.
    await fetch(`${server.baseUrl}/leases/${lease.id}/payments`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ amountDollars: '20', paidDate: '2026-01-15' }),
    });
    const after = await fetch(`${server.baseUrl}/leases/${lease.id}`, { headers: { cookie } });
    assert.match(await after.text(), /current/);
  });

  test('[R14] hardship pause shows "paused" and leaves the device leased', async () => {
    const cookie = loginAs(bag, staff);
    const family = bag.families.create({ name: 'Fourth Family', contact: '555-0400' });
    const device = makeAvailableDevice(bag.devices, 'SN-ROUTE-HARDSHIP');
    const lease = bag.deps.leaseService.createLease(family.id, device.assetTag, 'tester');

    await fetch(`${server.baseUrl}/leases/${lease.id}/hardship-pause`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ paused: 'true' }),
    });
    const res = await fetch(`${server.baseUrl}/leases/${lease.id}`, { headers: { cookie } });
    const text = await res.text();
    assert.match(text, /paused/);
    assert.equal(bag.devices.getById(device.id)?.status, 'leased');
  });

  test('[R15] the API index never advertises a lock/disable/brick action', async () => {
    const res = await fetch(`${server.baseUrl}/api`);
    const body = await res.text();
    assert.doesNotMatch(body, /lock|disable|brick/i);
  });
});
