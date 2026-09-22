import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db/connection.js';
import { buildDepsFromDb } from '../src/server.js';
import {
  isSeedOnBootEnabled,
  maybeSeedOnBoot,
} from '../src/seedOnBoot.js';

const envKeys = ['NODE_ENV', 'EWURK_SEED_ON_BOOT'] as const;

describe('EWURK_SEED_ON_BOOT', () => {
  let saved: Record<string, string | undefined>;

  before(() => {
    saved = {};
    for (const key of envKeys) {
      saved[key] = process.env[key];
    }
  });

  after(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  test('isSeedOnBootEnabled is false when flag unset', () => {
    delete process.env.EWURK_SEED_ON_BOOT;
    process.env.NODE_ENV = 'development';
    assert.equal(isSeedOnBootEnabled(), false);
  });

  test('isSeedOnBootEnabled is false in production even when flag is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.EWURK_SEED_ON_BOOT = 'true';
    assert.equal(isSeedOnBootEnabled(), false);
  });

  test('maybeSeedOnBoot seeds empty database in development when flag is true', () => {
    process.env.NODE_ENV = 'development';
    process.env.EWURK_SEED_ON_BOOT = 'true';
    const db = openDb(':memory:');
    const deps = buildDepsFromDb(db);
    maybeSeedOnBoot(deps, db);
    const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'staff@ewurk.org'").get() as {
      n: number;
    };
    assert.equal(row.n, 1);
    const devices = db.prepare('SELECT COUNT(*) AS n FROM devices').get() as { n: number };
    assert.equal(devices.n, 5);
    db.close();
  });

  test('maybeSeedOnBoot does not seed in production when flag is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.EWURK_SEED_ON_BOOT = 'true';
    const db = openDb(':memory:');
    const deps = buildDepsFromDb(db);
    maybeSeedOnBoot(deps, db);
    const users = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    assert.equal(users.n, 0);
    db.close();
  });

  test('maybeSeedOnBoot does not seed in development when flag is off', () => {
    delete process.env.EWURK_SEED_ON_BOOT;
    process.env.NODE_ENV = 'development';
    const db = openDb(':memory:');
    const deps = buildDepsFromDb(db);
    maybeSeedOnBoot(deps, db);
    const users = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    assert.equal(users.n, 0);
    db.close();
  });
});
