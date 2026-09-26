import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createMailerFromEnv } from '../src/adapters/mail/createMailer.js';
import { relayAppEnv } from '../src/adapters/mail/RelayMailer.js';

describe('relay mailer', () => {
  const keys = [
    'NOCTUSOFT_RELAY_BASE_URL',
    'NOCTUSOFT_API_KEY',
    'SMTP_HOST',
    'SMTP_FROM',
    'EMAIL_FROM',
    'NODE_ENV',
    'RAILWAY_ENVIRONMENT_NAME',
  ] as const;
  let saved: Record<string, string | undefined>;

  before(() => {
    saved = {};
    for (const key of keys) saved[key] = process.env[key];
  });

  after(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  test('createMailerFromEnv selects relay when the relay URL and key are set', () => {
    process.env.NOCTUSOFT_RELAY_BASE_URL = 'https://api.sendgrid.noctusoft.com';
    process.env.NOCTUSOFT_API_KEY = 'test-key';
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    const { kind } = createMailerFromEnv();
    assert.equal(kind, 'relay');
  });

  test('relay takes precedence over SMTP_HOST', () => {
    process.env.NOCTUSOFT_RELAY_BASE_URL = 'https://api.sendgrid.noctusoft.com';
    process.env.NOCTUSOFT_API_KEY = 'test-key';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_FROM = 'noreply@ewurk.org';
    const { kind } = createMailerFromEnv();
    assert.equal(kind, 'relay');
  });

  test('relayAppEnv maps Railway environment names', () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'dev';
    assert.equal(relayAppEnv(), 'dev');
    process.env.RAILWAY_ENVIRONMENT_NAME = 'uat';
    assert.equal(relayAppEnv(), 'uat');
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
    assert.equal(relayAppEnv(), 'production');
  });

  test('send posts to /email/send with X-App-Env and does not throw', async () => {
    process.env.NOCTUSOFT_RELAY_BASE_URL = 'https://api.sendgrid.noctusoft.com';
    process.env.NOCTUSOFT_API_KEY = 'test-key';
    process.env.SMTP_FROM = 'noreply@ewurk.org';
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
    let captured: { url: string; headers: Record<string, string>; body: string } | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      captured = {
        url: String(input),
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: String(init?.body ?? ''),
      };
      return new Response('{}', { status: 201 });
    };
    const { mailer } = createMailerFromEnv();
    (mailer as { opts: { fetchImpl: typeof fetch } }).opts.fetchImpl = fetchImpl;
    mailer.send('staff@ewurk.org', 'Your EWURK sign-in link', 'Sign in: https://ewurk.org/auth/verify?token=abc');
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(captured);
    assert.equal(captured.url, 'https://api.sendgrid.noctusoft.com/email/send');
    assert.equal(captured.headers['x-app-env'], 'production');
    assert.match(captured.headers.authorization, /^Bearer /);
    const parsed = JSON.parse(captured.body) as { to: string; from: string; text: string };
    assert.equal(parsed.to, 'staff@ewurk.org');
    assert.equal(parsed.from, 'noreply@ewurk.org');
    assert.match(parsed.text, /verify\?token=abc/);
  });
});
