import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { createMailerFromEnv } from '../src/adapters/mail/createMailer.js';
import { openDb } from '../src/db/connection.js';
import { buildDepsFromDb } from '../src/server.js';
import { buildFakeDeps, startTestServer, type TestServer } from './helpers/testApp.js';

describe('hosted: health and production composition', () => {
  let server: TestServer;

  before(async () => {
    const bag = buildFakeDeps();
    server = await startTestServer(bag.deps);
  });

  after(async () => {
    await server.close();
  });

  test('GET /health returns 200 JSON without a session', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, 'ok');
  });

  test('GET /dev/outbox is absent when devOutboxEnabled is false', async () => {
    const bag = buildFakeDeps();
    bag.deps.devOutboxEnabled = false;
    const prodServer = await startTestServer(bag.deps);
    try {
      const res = await fetch(`${prodServer.baseUrl}/dev/outbox`);
      assert.equal(res.status, 404);
      const text = await res.text();
      assert.match(text, /Not found/);
      assert.doesNotMatch(text, /"sentAt"/);
    } finally {
      await prodServer.close();
    }
  });
});

describe('hosted: mailer selection', () => {
  const envKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'NODE_ENV'] as const;
  let saved: Record<string, string | undefined>;

  before(() => {
    saved = {};
    for (const key of envKeys) {
      saved[key] = process.env[key];
    }
  });

  after(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  test('createMailerFromEnv does not select SMTP when SMTP_HOST is unset (development)', () => {
    delete process.env.SMTP_HOST;
    process.env.NODE_ENV = 'development';
    const { kind } = createMailerFromEnv();
    assert.notEqual(kind, 'smtp');
    assert.equal(kind, 'dev-outbox');
  });

  test('createMailerFromEnv does not select SMTP when SMTP_HOST is unset (production)', () => {
    delete process.env.SMTP_HOST;
    process.env.NODE_ENV = 'production';
    const { kind } = createMailerFromEnv();
    assert.notEqual(kind, 'smtp');
    assert.equal(kind, 'unconfigured');
  });

  test('createMailerFromEnv selects SMTP when SMTP_HOST is set', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_FROM = 'noreply@ewurk.org';
    delete process.env.NODE_ENV;
    const { kind } = createMailerFromEnv();
    assert.equal(kind, 'smtp');
  });
});

describe('hosted: fresh database boot', () => {
  test('empty file at EWURK_DB_PATH migrates and GET /login renders', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ewurk-hosted-'));
    const dbPath = join(dir, 'ewurk.db');
    writeFileSync(dbPath, '');
    const db = openDb(dbPath);
    const deps = buildDepsFromDb(db);
    const app = createApp(deps);
    const server = app.listen(0);
    try {
      const addr = server.address();
      assert.ok(addr && typeof addr === 'object');
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      const res = await fetch(`${baseUrl}/login`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /Send sign-in link/);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
