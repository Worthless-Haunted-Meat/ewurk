import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/http/errors.js';
import { ClassService } from '../src/services/classService.js';
import { openDb } from '../src/db/connection.js';
import { SqliteFamilyStore, SqliteClassStore } from '../src/adapters/sqlite/familyClassAdapters.js';
import {
  FakeClassStore,
  FakeLeaseStore,
  FakeFamilyStore,
  buildFakeDeps,
  seedUsers,
  loginAs,
  startTestServer,
  type TestServer,
  type FakeBag,
} from './helpers/testApp.js';
import type { DatabaseSync } from 'node:sqlite';
import type { User } from '../src/domain/types.js';

describe('[R16][R17][R18] ClassService (fake ports)', () => {
  function harness() {
    const classes = new FakeClassStore();
    const leases = new FakeLeaseStore();
    const families = new FakeFamilyStore();
    const service = new ClassService(classes, leases, families);
    return { classes, leases, families, service };
  }

  test('[R16] createSession creates a listed session', () => {
    const { service } = harness();
    const session = service.createSession('2026-01-24', 'Intro to Linux');
    assert.equal(session.topic, 'Intro to Linux');
    assert.equal(service.listSessions().length, 1);
  });

  test('[R17] buildRoster includes only families with an active lease', () => {
    const { leases, families, service } = harness();
    const active = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const ended = families.create({ name: 'Ended Family', contact: '555-0200' });
    leases.create({ familyId: active.id, startDate: '2026-01-01' }); // status 'active' by default
    const endedLease = leases.create({ familyId: ended.id, startDate: '2025-01-01' });
    endedLease.status = 'ended';

    const session = service.createSession('2026-01-24', 'Intro to Linux');
    const roster = service.buildRoster(session.id);
    const names = roster.map((f) => f.name);
    assert.ok(names.includes('Herrera Family'));
    assert.ok(!names.includes('Ended Family'));
  });

  test('[R17] buildRoster on a missing session throws NOT_FOUND', () => {
    const { service } = harness();
    assert.throws(
      () => service.buildRoster(9999),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });

  test('[R18] markAttendance persists present/absent for a family in a session', () => {
    const { classes, families, service } = harness();
    const family = families.create({ name: 'Herrera Family', contact: '555-0100' });
    const session = service.createSession('2026-01-24', 'Intro to Linux');
    service.markAttendance(session.id, family.id, true);
    assert.equal(classes.listAttendance(session.id).find((a) => a.familyId === family.id)?.present, true);
    service.markAttendance(session.id, family.id, false);
    assert.equal(classes.listAttendance(session.id).find((a) => a.familyId === family.id)?.present, false);
  });

  test('[R18] markAttendance on a missing session throws NOT_FOUND', () => {
    const { service } = harness();
    assert.throws(
      () => service.markAttendance(9999, 1, true),
      (err: unknown) => err instanceof AppError && err.code === 'NOT_FOUND',
    );
  });
});

describe('[R16][R17][R18] sqlite family/class adapters (real, :memory:)', () => {
  let db: DatabaseSync;

  before(() => {
    db = openDb(':memory:');
  });

  test('[R16] ClassStore createSession / getSession / listSessions', () => {
    const store = new SqliteClassStore(db);
    const session = store.createSession({ sessionDate: '2026-01-24', topic: 'Intro to Linux' });
    assert.equal(store.getSession(session.id)?.topic, 'Intro to Linux');
    assert.equal(store.listSessions().length, 1);
    assert.equal(store.getSession(9999), null);
  });

  test('[R18] ClassStore upsertAttendance / listAttendance / listAttendanceByFamily', () => {
    const familyStore = new SqliteFamilyStore(db);
    const classStore = new SqliteClassStore(db);
    const family = familyStore.create({ name: 'Herrera Family', contact: '555-0100' });
    const session = classStore.createSession({ sessionDate: '2026-01-24', topic: 'Intro to Linux' });

    classStore.upsertAttendance(session.id, family.id, false);
    let rows = classStore.listAttendance(session.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.present, false);

    classStore.upsertAttendance(session.id, family.id, true); // upsert, not a second row
    rows = classStore.listAttendance(session.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.present, true);

    const byFamily = classStore.listAttendanceByFamily(family.id);
    assert.equal(byFamily.length, 1);
    assert.equal(byFamily[0]!.topic, 'Intro to Linux');
  });
});

describe('[R16][R17][R18] class routes (wired app, fakes)', () => {
  let bag: FakeBag;
  let server: TestServer;
  let staff: User;
  let instructor: User;

  before(async () => {
    bag = buildFakeDeps();
    ({ staff, instructor } = seedUsers(bag));
    server = await startTestServer(bag.deps);
  });

  after(async () => {
    await server.close();
  });

  test('[R16] instructor can create a class session', async () => {
    const cookie = loginAs(bag, instructor);
    const res = await fetch(`${server.baseUrl}/classes`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ sessionDate: '2026-01-24', topic: 'Intro to Linux' }),
      redirect: 'manual',
    });
    assert.equal(res.status, 302);
    const list = await fetch(`${server.baseUrl}/classes`, { headers: { cookie } });
    assert.match(await list.text(), /Intro to Linux/);
  });

  test('[R17] building a roster picks up only families with an active lease', async () => {
    const cookie = loginAs(bag, staff);
    const family = bag.families.create({ name: 'Roster Family', contact: '555-0500' });
    const device = bag.devices.create({ donationId: 1, model: 'Dell', serial: 'SN-ROSTER' });
    bag.devices.updateStatus(device.id, 'available');
    bag.deps.leaseService.createLease(family.id, device.assetTag, 'tester');
    const session = bag.classes.createSession({ sessionDate: '2026-01-24', topic: 'Roster Day' });

    await fetch(`${server.baseUrl}/classes/${session.id}/roster`, { method: 'POST', headers: { cookie } });
    const detail = await fetch(`${server.baseUrl}/classes/${session.id}`, { headers: { cookie } });
    assert.match(await detail.text(), /Roster Family/);
  });

  test('[R18] marking attendance present is visible after reload', async () => {
    const cookie = loginAs(bag, instructor);
    const family = bag.families.create({ name: 'Attend Family', contact: '555-0600' });
    const session = bag.classes.createSession({ sessionDate: '2026-01-24', topic: 'Attendance Day' });
    bag.classes.upsertAttendance(session.id, family.id, false);

    await fetch(`${server.baseUrl}/classes/${session.id}/attendance`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ familyId: String(family.id), present: 'true' }),
    });
    const detail = await fetch(`${server.baseUrl}/classes/${session.id}`, { headers: { cookie } });
    const text = await detail.text();
    assert.match(text, /Attend Family/);
    assert.match(text, /present/);
  });
});
