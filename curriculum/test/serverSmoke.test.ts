import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('production server smoke', () => {
  let child: ChildProcess | undefined;
  const port = 3461;
  const base = `http://127.0.0.1:${port}`;

  before(async () => {
    execSync('npm run build', { cwd: packageRoot, stdio: 'pipe' });
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('node', ['dist/server.js'], {
        cwd: packageRoot,
        env: { ...process.env, PORT: String(port) },
        stdio: 'ignore',
      });
      child = proc;
      proc.on('error', reject);
      setTimeout(resolve, 600);
    });
  });

  after(() => {
    child?.kill('SIGTERM');
  });

  test('GET /lessons/01-welcome-linux-desktop.html returns 200 after build', async () => {
    const res = await fetch(`${base}/lessons/01-welcome-linux-desktop.html`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Welcome and the Linux desktop'));
  });
});
