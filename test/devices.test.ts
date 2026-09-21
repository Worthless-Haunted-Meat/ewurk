import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/http/errors.js';
import { DeviceService } from '../src/services/deviceService.js';
import { openDb } from '../src/db/connection.js';
import { SqliteDeviceStore } from '../src/adapters/sqlite/SqliteDeviceStore.js';
import {
  FakeDeviceStore,
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

function wipedPayload() {
  return { wipeMethod: 'NIST SP 800-88 Clear', wipeDate: '2026-01-16', wipeOperator: 'Tech One' };
}

describe('[R5][R6][R7][R8] DeviceService (fake ports)', () => {
  test('[R5] a valid next-step transition succeeds and logs a timeline event', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    const updated = service.transitionDevice(device.id, 'triaged', 'tester');
    assert.equal(updated.status, 'triaged');
    const { events } = service.getTimeline(device.id);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, 'triaged');
    assert.equal(events[0]!.actor, 'tester');
  });

  test('[R5] an out-of-order transition is rejected with INVALID_TRANSITION and leaves status unchanged', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    service.transitionDevice(device.id, 'triaged', 'tester');
    assert.throws(
      () => service.transitionDevice(device.id, 'leased', 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_TRANSITION',
    );
    assert.equal(devices.getById(device.id)?.status, 'triaged');
  });

  test('[R6] transitioning to wiped without method/date/operator is rejected with WIPE_FIELDS_REQUIRED', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    service.transitionDevice(device.id, 'triaged', 'tester');
    assert.throws(
      () => service.transitionDevice(device.id, 'wiped', 'tester', { wipeMethod: 'Clear' }),
      (err: unknown) => err instanceof AppError && err.code === 'WIPE_FIELDS_REQUIRED',
    );
  });

  test('[R6] transitioning to wiped with all three fields persists them on the device', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    service.transitionDevice(device.id, 'triaged', 'tester');
    const wiped = service.transitionDevice(device.id, 'wiped', 'tester', wipedPayload());
    assert.equal(wiped.wipeMethod, 'NIST SP 800-88 Clear');
    assert.equal(wiped.wipeDate, '2026-01-16');
    assert.equal(wiped.wipeOperator, 'Tech One');
  });

  test('[R6] THE INVARIANT: a device cannot reach available without a recorded wipe, even if it somehow reaches "imaged" with no wipe fields', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    // Bypass the service entirely to simulate a data-integrity edge case:
    // a device row sitting at 'imaged' with no wipe fields ever recorded.
    devices.updateStatus(device.id, 'imaged');
    assert.equal(devices.getById(device.id)?.wipeMethod, null);
    assert.throws(
      () => service.transitionDevice(device.id, 'available', 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'WIPE_REQUIRED',
    );
    assert.equal(devices.getById(device.id)?.status, 'imaged', 'status must not change on a rejected transition');
  });

  test('[R6] the full happy path reaches available only after a real wipe record exists', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    service.transitionDevice(device.id, 'triaged', 'tester');
    service.transitionDevice(device.id, 'wiped', 'tester', wipedPayload());
    service.transitionDevice(device.id, 'refurbished', 'tester');
    service.transitionDevice(device.id, 'imaged', 'tester');
    const available = service.transitionDevice(device.id, 'available', 'tester');
    assert.equal(available.status, 'available');
  });

  test('[R7] getTimeline returns the device and its events in order', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    const device = devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-1' });
    service.transitionDevice(device.id, 'triaged', 'tester');
    service.transitionDevice(device.id, 'wiped', 'tester', wipedPayload());
    const { device: found, events } = service.getTimeline(device.id);
    assert.equal(found.id, device.id);
    assert.deepEqual(events.map((e) => e.eventType), ['triaged', 'wiped']);
  });

  test('[R7] getTimeline on a missing device throws NOT_FOUND', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    assert.throws(
      () => service.getTimeline(999),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });

  test('[R8] searchBySerial finds the right device and returns null for an unknown serial', () => {
    const devices = new FakeDeviceStore();
    const service = new DeviceService(devices, new FakeClock());
    devices.create({ donationId: 1, model: 'Dell Latitude 5490', serial: 'SN-UNIQUE-1' });
    assert.equal(service.searchBySerial('SN-UNIQUE-1')?.serial, 'SN-UNIQUE-1');
    assert.equal(service.searchBySerial('does-not-exist'), null);
  });
});

describe('[R5][R6][R7][R8] SqliteDeviceStore (real, :memory:)', () => {
  let db: DatabaseSync;
  let donationId: number;

  before(() => {
    db = openDb(':memory:');
    db.prepare("INSERT INTO donations (donor_org, pickup_date, status, created_at) VALUES ('ACME', '2026-01-01', 'scheduled', datetime('now'))").run();
    donationId = 1;
  });

  test('[R2] create mints sequential EW-#### asset tags', () => {
    const store = new SqliteDeviceStore(db);
    const d1 = store.create({ donationId, model: 'Dell Latitude 5490', serial: 'SN-A' });
    const d2 = store.create({ donationId, model: 'Dell Latitude 5490', serial: 'SN-B' });
    assert.match(d1.assetTag, /^EW-\d{4,}$/);
    assert.notEqual(d1.assetTag, d2.assetTag);
    assert.equal(d1.status, 'received');
  });

  test('[R8] getByAssetTag / findBySerial / listByDonation / listAll', () => {
    const store = new SqliteDeviceStore(db);
    const created = store.create({ donationId, model: 'iPad Air', serial: 'SN-FIND-ME' });
    assert.equal(store.getByAssetTag(created.assetTag)?.serial, 'SN-FIND-ME');
    assert.equal(store.findBySerial('SN-FIND-ME')?.assetTag, created.assetTag);
    assert.ok(store.listByDonation(donationId).length >= 1);
    assert.ok(store.listAll().length >= 1);
    assert.equal(store.getByAssetTag('EW-9999'), null);
  });

  test('[R6] updateStatus persists status and wipe fields; appendEvent/listEvents round-trip', () => {
    const store = new SqliteDeviceStore(db);
    const created = store.create({ donationId, model: 'Dell Latitude 5490', serial: 'SN-WIPE' });
    store.updateStatus(created.id, 'triaged');
    const wiped = store.updateStatus(created.id, 'wiped', wipedPayload());
    assert.equal(wiped.wipeMethod, 'NIST SP 800-88 Clear');
    store.appendEvent(created.id, 'triaged', 'tester');
    store.appendEvent(created.id, 'wiped', 'tester');
    assert.equal(store.listEvents(created.id).length, 2);
  });

  test('[R10] setReplacesLink records the link on both devices', () => {
    const store = new SqliteDeviceStore(db);
    const a = store.create({ donationId, model: 'Dell', serial: 'SN-OLD' });
    const b = store.create({ donationId, model: 'Dell', serial: 'SN-NEW' });
    store.setReplacesLink(b.id, a.id);
    assert.equal(store.getById(b.id)?.replacesDeviceId, a.id);
    assert.equal(store.getById(a.id)?.replacedByDeviceId, b.id);
  });
});

describe('[R5][R6][R7][R8] device routes (wired app, fakes)', () => {
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

  test('[R5] POST transition to an invalid next step returns 409 INVALID_TRANSITION over the API', async () => {
    const cookie = loginAs(bag, staff);
    const donation = bag.donations.create({ donorOrg: 'ACME', pickupDate: '2026-01-01' });
    const device = bag.devices.create({ donationId: donation.id, model: 'Dell', serial: 'SN-1' });

    const res = await fetch(`${server.baseUrl}/api/devices/${device.assetTag}/transition`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ to: 'leased' }),
    });
    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_TRANSITION');
  });

  test('[R6] the "Mark available" action is hidden on the device page until a wipe is recorded, then appears', async () => {
    const cookie = loginAs(bag, staff);
    const donation = bag.donations.create({ donorOrg: 'ACME', pickupDate: '2026-01-01' });
    const device = bag.devices.create({ donationId: donation.id, model: 'Dell', serial: 'SN-2' });
    await fetch(`${server.baseUrl}/devices/${device.assetTag}/transition`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: 'triaged' }),
    });

    const beforeWipe = await fetch(`${server.baseUrl}/devices/${device.assetTag}`, { headers: { cookie } });
    const beforeText = await beforeWipe.text();
    assert.doesNotMatch(beforeText, /value="available"/);
    assert.match(beforeText, /value="wiped"/);

    await fetch(`${server.baseUrl}/devices/${device.assetTag}/transition`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: 'wiped', ...wipedPayload() }),
    });
    await fetch(`${server.baseUrl}/devices/${device.assetTag}/transition`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: 'refurbished' }),
    });
    await fetch(`${server.baseUrl}/devices/${device.assetTag}/transition`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: 'imaged' }),
    });

    const afterWipe = await fetch(`${server.baseUrl}/devices/${device.assetTag}`, { headers: { cookie } });
    const afterText = await afterWipe.text();
    assert.match(afterText, /value="available"/);
  });

  test('[R7] GET /devices/:assetTag shows the full timeline', async () => {
    const cookie = loginAs(bag, staff);
    const donation = bag.donations.create({ donorOrg: 'ACME', pickupDate: '2026-01-01' });
    const device = bag.devices.create({ donationId: donation.id, model: 'Dell', serial: 'SN-3' });
    await fetch(`${server.baseUrl}/devices/${device.assetTag}/transition`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: 'triaged' }),
    });
    const res = await fetch(`${server.baseUrl}/devices/${device.assetTag}`, { headers: { cookie } });
    const text = await res.text();
    assert.match(text, /triaged/);
  });

  test('[R8] GET /devices?serial= (web) shows the donor org and current holder', async () => {
    const cookie = loginAs(bag, staff);
    const donation = bag.donations.create({ donorOrg: 'ACME Corp Donor', pickupDate: '2026-01-01' });
    const device = bag.devices.create({ donationId: donation.id, model: 'Dell', serial: 'SN-HOLDER' });
    bag.devices.updateStatus(device.id, 'available');
    const family = bag.families.create({ name: 'Holder Family', contact: '555-0000' });
    bag.deps.leaseService.createLease(family.id, device.assetTag, 'tester');

    const res = await fetch(`${server.baseUrl}/devices?serial=SN-HOLDER`, { headers: { cookie } });
    const text = await res.text();
    assert.match(text, /ACME Corp Donor/);
    assert.match(text, /Holder Family/);
  });

  test('[R8] GET /api/devices?serial= finds the donor-linked device', async () => {
    const cookie = loginAs(bag, staff);
    const donation = bag.donations.create({ donorOrg: 'ACME', pickupDate: '2026-01-01' });
    bag.devices.create({ donationId: donation.id, model: 'Dell', serial: 'SN-FINDME' });
    const res = await fetch(`${server.baseUrl}/api/devices?serial=SN-FINDME`, { headers: { cookie } });
    const list = (await res.json()) as Array<{ serial: string }>;
    assert.equal(list.length, 1);
    assert.equal(list[0]!.serial, 'SN-FINDME');
  });
});
