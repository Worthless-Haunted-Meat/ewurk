import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/http/errors.js';
import { DonationService } from '../src/services/donationService.js';
import { openDb } from '../src/db/connection.js';
import { SqliteDonationStore } from '../src/adapters/sqlite/SqliteDonationStore.js';
import {
  FakeDonationStore,
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

describe('[R1][R2][R3][R4] DonationService (fake ports)', () => {
  test('[R1] createDonation starts a donation as scheduled', () => {
    const donations = new FakeDonationStore();
    const devices = new FakeDeviceStore();
    const service = new DonationService(donations, devices, new FakeClock());
    const donation = service.createDonation({ donorOrg: "St. Anne's Parish", pickupDate: '2026-01-20' });
    assert.equal(donation.donorOrg, "St. Anne's Parish");
    assert.equal(donation.status, 'scheduled');
  });

  test('[R2] receiveItem mints a device with a fresh asset tag linked to the donation', () => {
    const donations = new FakeDonationStore();
    const devices = new FakeDeviceStore();
    const service = new DonationService(donations, devices, new FakeClock());
    const donation = service.createDonation({ donorOrg: 'ACME Corp', pickupDate: '2026-01-20' });
    const d1 = service.receiveItem(donation.id, { model: 'Dell Latitude 5490', serial: 'SN-1' }, 'tester');
    const d2 = service.receiveItem(donation.id, { model: 'Dell Latitude 5490', serial: 'SN-2' }, 'tester');
    assert.notEqual(d1.assetTag, d2.assetTag);
    assert.equal(d1.donationId, donation.id);
    assert.equal(d1.status, 'received');
  });

  test('[R2] receiveItem on a missing donation throws NOT_FOUND', () => {
    const donations = new FakeDonationStore();
    const devices = new FakeDeviceStore();
    const service = new DonationService(donations, devices, new FakeClock());
    assert.throws(
      () => service.receiveItem(999, { model: 'x', serial: 'y' }, 'tester'),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });

  test('[R3] generateAcknowledgment lists every item and marks the donation acknowledged', () => {
    const donations = new FakeDonationStore();
    const devices = new FakeDeviceStore();
    const service = new DonationService(donations, devices, new FakeClock());
    const donation = service.createDonation({ donorOrg: "St. Anne's Parish", pickupDate: '2026-01-20' });
    service.receiveItem(donation.id, { model: 'Dell Latitude 5490', serial: 'SN-1' }, 'tester');
    service.receiveItem(donation.id, { model: 'iPad Air', serial: 'SN-2' }, 'tester');

    const letter = service.generateAcknowledgment(donation.id);
    assert.equal(letter.donorOrg, "St. Anne's Parish");
    assert.equal(letter.items.length, 2);
    assert.match(letter.text, /Dell Latitude 5490/);
    assert.match(letter.text, /iPad Air/);
    assert.equal(donations.getById(donation.id)?.status, 'acknowledged');
  });

  test('[R3] generateAcknowledgment on a donation with no items throws NO_ITEMS', () => {
    const donations = new FakeDonationStore();
    const devices = new FakeDeviceStore();
    const service = new DonationService(donations, devices, new FakeClock());
    const donation = service.createDonation({ donorOrg: 'Empty Org', pickupDate: '2026-01-20' });
    assert.throws(
      () => service.generateAcknowledgment(donation.id),
      (err: unknown) => err instanceof AppError && err.code === 'NO_ITEMS',
    );
  });

  test('[R4] the acknowledgment letter text never contains a dollar sign or the word value/worth', () => {
    const donations = new FakeDonationStore();
    const devices = new FakeDeviceStore();
    const service = new DonationService(donations, devices, new FakeClock());
    const donation = service.createDonation({ donorOrg: 'ACME Corp', pickupDate: '2026-01-20' });
    service.receiveItem(donation.id, { model: 'Dell Latitude 5490', serial: 'SN-1' }, 'tester');
    const letter = service.generateAcknowledgment(donation.id);
    assert.doesNotMatch(letter.text, /\$/);
    assert.doesNotMatch(letter.text, /\bvalue\b/i);
    assert.doesNotMatch(letter.text, /\bworth\b/i);
    assert.match(letter.text, /No goods or services were provided in exchange for this donation\./);
  });
});

describe('[R1][R3] SqliteDonationStore (real, :memory:)', () => {
  let db: DatabaseSync;

  before(() => {
    db = openDb(':memory:');
  });

  test('[R1] create / getById / list round-trip', () => {
    const store = new SqliteDonationStore(db);
    const donation = store.create({ donorOrg: 'ACME Corp', pickupDate: '2026-02-01' });
    assert.equal(store.getById(donation.id)?.donorOrg, 'ACME Corp');
    assert.equal(store.list().length, 1);
    assert.equal(store.getById(999999), null);
  });

  test('[R3] updateStatus persists the new status', () => {
    const store = new SqliteDonationStore(db);
    const donation = store.create({ donorOrg: 'Second Org', pickupDate: '2026-02-02' });
    const updated = store.updateStatus(donation.id, 'acknowledged');
    assert.equal(updated.status, 'acknowledged');
    assert.equal(store.getById(donation.id)?.status, 'acknowledged');
  });
});

describe('[R1][R2][R3][R4] donation routes (wired app, fakes)', () => {
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

  test('[R1][R2][R3][R4] full web flow: create donation, receive items, generate a value-free acknowledgment', async () => {
    const cookie = loginAs(bag, staff);

    const createRes = await fetch(`${server.baseUrl}/donations`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ donorOrg: "St. Anne's Parish", pickupDate: '2026-01-20' }),
      redirect: 'manual',
    });
    assert.equal(createRes.status, 302);
    const donationId = createRes.headers.get('location')!.split('/').pop();

    const itemRes = await fetch(`${server.baseUrl}/donations/${donationId}/items`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ model: 'Dell Latitude 5490', serial: 'SN-100' }),
      redirect: 'manual',
    });
    assert.equal(itemRes.status, 302);

    const detailRes = await fetch(`${server.baseUrl}/donations/${donationId}`, { headers: { cookie } });
    const detailText = await detailRes.text();
    assert.match(detailText, /EW-\d{4,}/);

    const ackRes = await fetch(`${server.baseUrl}/donations/${donationId}/acknowledgment`, { headers: { cookie } });
    assert.equal(ackRes.status, 200);
    const ackText = await ackRes.text();
    assert.doesNotMatch(ackText, /\$\d/);
    assert.match(ackText, /Dell Latitude 5490/);
  });

  test('[R4] GET /api/donations/:id/acknowledgment JSON never includes a dollar amount', async () => {
    const cookie = loginAs(bag, staff);
    const createRes = await fetch(`${server.baseUrl}/api/donations`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ donorOrg: 'ACME Corp', pickupDate: '2026-01-21' }),
    });
    const donation = (await createRes.json()) as { id: number };
    await fetch(`${server.baseUrl}/api/donations/${donation.id}/items`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'iPad Air', serial: 'SN-200' }),
    });
    const ackRes = await fetch(`${server.baseUrl}/api/donations/${donation.id}/acknowledgment`, { headers: { cookie } });
    assert.equal(ackRes.status, 200);
    const raw = await ackRes.text();
    assert.doesNotMatch(raw, /\$\d/);
  });

  test('[R3] acknowledgment on a donation with no items is rejected (422)', async () => {
    const cookie = loginAs(bag, staff);
    const createRes = await fetch(`${server.baseUrl}/api/donations`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ donorOrg: 'Empty Org', pickupDate: '2026-01-22' }),
    });
    const donation = (await createRes.json()) as { id: number };
    const ackRes = await fetch(`${server.baseUrl}/api/donations/${donation.id}/acknowledgment`, { headers: { cookie } });
    assert.equal(ackRes.status, 422);
    const body = (await ackRes.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'NO_ITEMS');
  });
});
