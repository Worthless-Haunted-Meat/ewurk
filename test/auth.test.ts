import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/http/errors.js';
import { AuthService } from '../src/services/authService.js';
import { openDb } from '../src/db/connection.js';
import { SqliteUserStore, SqliteTokenStore, SqliteSessionStore } from '../src/adapters/sqlite/authAdapters.js';
import { FakeUserStore, FakeTokenStore, FakeSessionStore, FakeMailer, FakeClock, buildFakeDeps, seedUsers, startTestServer, type TestServer, type FakeBag } from './helpers/testApp.js';
import type { DatabaseSync } from 'node:sqlite';

describe('[R20] AuthService (fake ports)', () => {
  test('[R20] requestMagicLink for a known email writes a link to the outbox, and verifying it starts a session', () => {
    const users = new FakeUserStore();
    users.users.push({ id: 1, email: 'staff@ewurk.org', name: 'Staff One', role: 'staff' });
    const tokens = new FakeTokenStore();
    const sessions = new FakeSessionStore();
    const mailer = new FakeMailer();
    const clock = new FakeClock();
    const auth = new AuthService(users, tokens, sessions, mailer, clock);

    auth.requestMagicLink('staff@ewurk.org');
    assert.equal(mailer.list().length, 1);
    const body = mailer.list()[0]!.body;
    const match = body.match(/token=([a-f0-9]+)/i);
    assert.ok(match, 'outbox body should contain a token= link');
    const rawToken = match![1]!;

    const { sessionId, user } = auth.verifyMagicLink(rawToken);
    assert.equal(user.email, 'staff@ewurk.org');
    assert.equal(auth.getSessionUser(sessionId)?.email, 'staff@ewurk.org');
  });

  test('[R20] requestMagicLink for an unknown email never throws and sends nothing', () => {
    const users = new FakeUserStore();
    const tokens = new FakeTokenStore();
    const sessions = new FakeSessionStore();
    const mailer = new FakeMailer();
    const clock = new FakeClock();
    const auth = new AuthService(users, tokens, sessions, mailer, clock);

    assert.doesNotThrow(() => auth.requestMagicLink('nobody@ewurk.org'));
    assert.equal(mailer.list().length, 0);
  });

  test('[R20] verifyMagicLink rejects an unknown token', () => {
    const users = new FakeUserStore();
    const tokens = new FakeTokenStore();
    const sessions = new FakeSessionStore();
    const mailer = new FakeMailer();
    const clock = new FakeClock();
    const auth = new AuthService(users, tokens, sessions, mailer, clock);

    assert.throws(() => auth.verifyMagicLink('not-a-real-token'), (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, 'INVALID_TOKEN');
      return true;
    });
  });

  test('[R20] a token can only be used once', () => {
    const users = new FakeUserStore();
    users.users.push({ id: 1, email: 'staff@ewurk.org', name: 'Staff One', role: 'staff' });
    const tokens = new FakeTokenStore();
    const sessions = new FakeSessionStore();
    const mailer = new FakeMailer();
    const clock = new FakeClock();
    const auth = new AuthService(users, tokens, sessions, mailer, clock);

    auth.requestMagicLink('staff@ewurk.org');
    const rawToken = mailer.list()[0]!.body.match(/token=([a-f0-9]+)/i)![1]!;
    auth.verifyMagicLink(rawToken);
    assert.throws(() => auth.verifyMagicLink(rawToken));
  });

  test('[R20] logout ends the session', () => {
    const users = new FakeUserStore();
    users.users.push({ id: 1, email: 'staff@ewurk.org', name: 'Staff One', role: 'staff' });
    const tokens = new FakeTokenStore();
    const sessions = new FakeSessionStore();
    const mailer = new FakeMailer();
    const clock = new FakeClock();
    const auth = new AuthService(users, tokens, sessions, mailer, clock);

    auth.requestMagicLink('staff@ewurk.org');
    const rawToken = mailer.list()[0]!.body.match(/token=([a-f0-9]+)/i)![1]!;
    const { sessionId } = auth.verifyMagicLink(rawToken);
    auth.logout(sessionId);
    assert.equal(auth.getSessionUser(sessionId), null);
  });
});

describe('[R20] sqlite auth adapters (real, :memory:)', () => {
  let db: DatabaseSync;

  before(() => {
    db = openDb(':memory:');
    db.prepare(
      'INSERT INTO users (email, name, role, created_at) VALUES (?, ?, ?, ?)',
    ).run('staff@ewurk.org', 'Staff One', 'staff', new Date().toISOString());
  });

  test('[R20] SqliteUserStore.findByEmail / getById / list round-trip', () => {
    const users = new SqliteUserStore(db);
    const byEmail = users.findByEmail('staff@ewurk.org');
    assert.ok(byEmail);
    assert.equal(byEmail!.role, 'staff');
    assert.equal(users.getById(byEmail!.id)?.email, 'staff@ewurk.org');
    assert.equal(users.list().length, 1);
    assert.equal(users.findByEmail('nobody@ewurk.org'), null);
  });

  test('[R20] SqliteTokenStore.issue / consume is single-use and respects expiry', () => {
    const tokens = new SqliteTokenStore(db);
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    tokens.issue(1, 'hash-a', future);
    assert.equal(tokens.consume('hash-a'), 1);
    assert.equal(tokens.consume('hash-a'), null, 'a used token cannot be consumed twice');
    tokens.issue(1, 'hash-b', past);
    assert.equal(tokens.consume('hash-b'), null, 'an expired token cannot be consumed');
    assert.equal(tokens.consume('never-issued'), null);
  });

  test('[R20] SqliteSessionStore.create / get / destroy', () => {
    const sessions = new SqliteSessionStore(db);
    const future = new Date(Date.now() + 60_000).toISOString();
    const id = sessions.create(1, future);
    assert.equal(sessions.get(id)?.userId, 1);
    sessions.destroy(id);
    assert.equal(sessions.get(id), null);
  });
});

describe('[R20] auth routes (wired app, fakes)', () => {
  let bag: FakeBag;
  let server: TestServer;

  before(async () => {
    bag = buildFakeDeps();
    seedUsers(bag);
    server = await startTestServer(bag.deps);
  });

  after(async () => {
    await server.close();
  });

  test('[R20] POST /auth/magic-link then GET /dev/outbox then GET /auth/verify starts a session that GET / recognizes', async () => {
    const linkRes = await fetch(`${server.baseUrl}/auth/magic-link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'staff@ewurk.org' }),
      redirect: 'manual',
    });
    assert.equal(linkRes.status, 302);

    const outboxRes = await fetch(`${server.baseUrl}/dev/outbox`);
    assert.equal(outboxRes.status, 200);
    const outbox = (await outboxRes.json()) as Array<{ to: string; body: string }>;
    const entry = outbox.find((e) => e.to === 'staff@ewurk.org');
    assert.ok(entry, 'outbox should contain a link for the requested email');
    const match = entry!.body.match(/token=([a-f0-9]+)/i);
    assert.ok(match, 'outbox entry should contain a verify link with a token');

    const verifyRes = await fetch(`${server.baseUrl}/auth/verify?token=${match![1]}`, { redirect: 'manual' });
    assert.equal(verifyRes.status, 302);
    assert.equal(verifyRes.headers.get('location'), '/');
    const setCookie = verifyRes.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('ewurk_session='));

    const cookie = setCookie!.split(';')[0]!;
    const homeRes = await fetch(`${server.baseUrl}/`, { headers: { cookie } });
    const text = await homeRes.text();
    assert.match(text, /Staff One/);
  });

  test('[R20] GET /auth/verify with a bogus token does not start a session', async () => {
    const res = await fetch(`${server.baseUrl}/auth/verify?token=not-a-real-token`);
    assert.equal(res.status, 401);
  });
});
