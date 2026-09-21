import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db/connection.js';
import { buildDepsFromDb } from '../src/server.js';
import { seed } from '../src/seed.js';
import type { AppDeps } from '../src/deps.js';
import type { DatabaseSync } from 'node:sqlite';

describe('[R23] seed (real sqlite, :memory:)', () => {
  let deps: AppDeps;
  let db: DatabaseSync;

  before(() => {
    db = openDb(':memory:');
    deps = buildDepsFromDb(db);
    seed(deps, db);
  });

  test('[R23] seeds exactly one donation with items', () => {
    const donations = deps.donations.list();
    assert.equal(donations.length, 1);
    assert.equal(donations[0]!.donorOrg.length > 0, true);
    assert.ok(deps.devices.listByDonation(donations[0]!.id).length >= 5);
  });

  test('[R23] seeds five devices spread across at least four distinct lifecycle stages', () => {
    const devices = deps.devices.listAll();
    assert.equal(devices.length, 5);
    const distinctStatuses = new Set(devices.map((d) => d.status));
    assert.ok(distinctStatuses.size >= 4, `expected >=4 distinct statuses, got ${[...distinctStatuses].join(',')}`);
  });

  test('[R23] seeds two leases', () => {
    assert.equal(deps.leases.listAll().length, 2);
  });

  test('[R23] seeds one visible swap (a replaces/replaced-by link between two devices)', () => {
    const devices = deps.devices.listAll();
    const withLink = devices.find((d) => d.replacesDeviceId !== null);
    assert.ok(withLink, 'at least one device should show a replaces link from the seeded swap');
    const outgoing = devices.find((d) => d.id === withLink!.replacesDeviceId);
    assert.ok(outgoing, 'the device it replaces should exist');
    assert.equal(outgoing!.replacedByDeviceId, withLink!.id);
  });

  test('[R23] seeds three users, one per role', () => {
    const users = deps.users.list();
    const roles = users.map((u) => u.role).sort();
    assert.deepEqual(roles, ['instructor', 'staff', 'volunteer']);
  });
});
