import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

import { packageRoot } from '../src/paths.js';

describe('qemu smoke (optional)', () => {
  it('runs qemu/smoke.sh when EWURK_QEMU_SMOKE=1', { skip: process.env.EWURK_QEMU_SMOKE !== '1' }, () => {
    const script = path.join(packageRoot(), 'qemu', 'smoke.sh');
    const result = spawnSync('bash', [script], {
      cwd: packageRoot(),
      encoding: 'utf8',
      env: { ...process.env, EWURK_QEMU_SMOKE: '1' },
    });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });

  it('documents EWURK_QEMU_SMOKE gate in README', async () => {
    const readme = await readFile(path.join(packageRoot(), 'README.md'), 'utf8');
    assert.match(readme, /EWURK_QEMU_SMOKE=1/);
  });
});
