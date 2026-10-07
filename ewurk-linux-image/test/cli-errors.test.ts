// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import path from 'node:path';

import {
  formatMissingHostDepsMessage,
  missingHostBinaries,
} from '../src/cli/hostDeps.js';
import { packageRoot } from '../src/paths.js';

describe('CLI host dependency errors', () => {
  it('formats missing live-build tools with install instructions', () => {
    const message = formatMissingHostDepsMessage(['lb', 'debootstrap']);
    assert.match(message, /host-deps\.sh --install/);
    assert.match(message, /lb/);
  });

  it('buildImage exits with actionable message when lb is missing', () => {
    const missing = missingHostBinaries();
    if (!missing.includes('lb')) {
      return;
    }
    const script = path.join(packageRoot(), 'src/cli/buildImage.ts');
    const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
      cwd: packageRoot(),
      encoding: 'utf8',
      env: {
        ...process.env,
        EWURK_RUN_LB_BUILD: '1',
        PATH: '/usr/bin:/bin',
      },
    });
    assert.notEqual(result.status, 0);
    const output = `${result.stderr}${result.stdout}`;
    assert.match(output, /host-deps\.sh/);
    assert.doesNotMatch(output, /^\s*at /m);
  });
});
