import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';

const shopFixtureCsv = readFileSync(
  fileURLToPath(new URL('../fixtures/shop-fixture.csv', import.meta.url)),
  'utf8',
);

describe('HTTP smoke', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test('GET / returns 200 with CSV upload form', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /EWURK lease economics/);
    assert.match(body, /name="csv_text"/);
    assert.match(body, /type="file"/);
  });

  test('POST /calculate with shop fixture CSV shows months_to_recover', async () => {
    const res = await fetch(`${baseUrl}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csv_text: shopFixtureCsv }),
    });
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /months_to_recover:\s*5/);
    assert.match(body, /cost_cents_per_available/);
  });

  test('GET /health returns ok JSON', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { status: string };
    assert.equal(json.status, 'ok');
  });
});
