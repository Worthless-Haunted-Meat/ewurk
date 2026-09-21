import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFakeDeps, seedUsers, loginAs, startTestServer, type TestServer, type FakeBag } from './helpers/testApp.js';
import type { User } from '../src/domain/types.js';

describe('R24: repository is licensed GPL-3.0', () => {
  test('[R24] LICENSE starts with the GPL v3 header', () => {
    const text = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8');
    const head = text.split('\n').slice(0, 3).join('\n');
    assert.match(head, /GNU GENERAL PUBLIC LICENSE/);
    assert.match(head, /Version 3/);
  });

  test('[R24] package.json declares a GPL-3.0 license', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { license: string };
    assert.match(pkg.license, /GPL-3\.0/);
  });
});

describe('R25/R21: platform routes (wired app, fakes)', () => {
  let bag: FakeBag;
  let server: TestServer;
  let staff: User;
  let volunteer: User;
  let instructor: User;

  before(async () => {
    bag = buildFakeDeps();
    ({ staff, volunteer, instructor } = seedUsers(bag));
    server = await startTestServer(bag.deps);
  });

  after(async () => {
    await server.close();
  });

  test('[R25] unknown /api path returns a 404 JSON envelope', async () => {
    const res = await fetch(`${server.baseUrl}/api/does-not-exist`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  test('[R21] unauthenticated GET /leases redirects to /login', async () => {
    const res = await fetch(`${server.baseUrl}/leases`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/login');
  });

  test('[R21] volunteer is blocked from /leases (web) with a visible not-authorized page', async () => {
    const cookie = loginAs(bag, volunteer);
    const res = await fetch(`${server.baseUrl}/leases`, { headers: { cookie } });
    assert.equal(res.status, 403);
    const text = await res.text();
    assert.match(text, /Not authorized/);
  });

  test('[R21] volunteer is blocked from /api/leases (api) with a JSON envelope', async () => {
    const cookie = loginAs(bag, volunteer);
    const res = await fetch(`${server.baseUrl}/api/leases`, { headers: { cookie } });
    assert.equal(res.status, 403);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  test('[R21] instructor is blocked from /donations (web)', async () => {
    const cookie = loginAs(bag, instructor);
    const res = await fetch(`${server.baseUrl}/donations`, { headers: { cookie } });
    assert.equal(res.status, 403);
  });

  test('[R21] staff can reach /classes (web, 200)', async () => {
    const cookie = loginAs(bag, staff);
    const res = await fetch(`${server.baseUrl}/classes`, { headers: { cookie } });
    assert.equal(res.status, 200);
  });

  test('[R21] volunteer nav omits Leases and Classes links on the dashboard', async () => {
    const cookie = loginAs(bag, volunteer);
    const res = await fetch(`${server.baseUrl}/`, { headers: { cookie } });
    const text = await res.text();
    assert.doesNotMatch(text, /href="\/leases"/);
    assert.doesNotMatch(text, /href="\/classes"/);
  });
});
