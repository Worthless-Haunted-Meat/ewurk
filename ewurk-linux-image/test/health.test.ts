import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';

describe('GET /', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert(address && typeof address === 'object');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('returns HTTP 200 with project metadata', async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { ok: boolean; project: string };
    assert.equal(body.ok, true);
    assert.equal(body.project, 'ewurk-linux-image');
  });
});
