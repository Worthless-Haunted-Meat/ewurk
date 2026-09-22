import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db/connection.js';
import { SqliteUserStore, SqliteTokenStore, SqliteSessionStore } from '../src/adapters/sqlite/authAdapters.js';
import { AuthService } from '../src/services/authService.js';
import { FakeClock, FakeMailer } from './helpers/testApp.js';
import type { DatabaseSync } from 'node:sqlite';

describe('[R20] sqlite auth stores respect injected Clock for expiry', () => {
  let db: DatabaseSync;

  before(() => {
    db = openDb(':memory:');
    db.prepare('INSERT INTO users (email, name, role, created_at) VALUES (?, ?, ?, ?)').run(
      'staff@ewurk.org',
      'Staff One',
      'staff',
      '2020-06-01T12:00:00.000Z',
    );
  });

  test('a magic link issued at a frozen clock time is consumable on the same clock', () => {
    const clock = new FakeClock('2020-06-01T12:00:00.000Z');
    const users = new SqliteUserStore(db);
    const tokens = new SqliteTokenStore(db, clock);
    const sessions = new SqliteSessionStore(db, clock);
    const mailer = new FakeMailer();
    const auth = new AuthService(users, tokens, sessions, mailer, clock);

    auth.requestMagicLink('staff@ewurk.org');
    assert.equal(mailer.list().length, 1);
    const match = mailer.list()[0]!.body.match(/token=([a-f0-9]+)/i);
    assert.ok(match);
    const rawToken = match![1]!;

    const { sessionId, user } = auth.verifyMagicLink(rawToken);
    assert.equal(user.email, 'staff@ewurk.org');
    assert.ok(auth.getSessionUser(sessionId));
  });
});
