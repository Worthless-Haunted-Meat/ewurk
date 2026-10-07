import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { packageRoot } from '../src/paths.js';
import {
  hookEnablesFirstbootService,
  verifyLivebuildLayout,
} from '../src/verify/livebuildLayout.js';

describe('live-build layout', () => {
  it('includes required config, overlay, and hook paths', () => {
    const checks = verifyLivebuildLayout();
    const missing = checks.filter((c) => !c.ok);
    assert.deepEqual(
      missing.map((c) => c.path),
      [],
      `missing paths: ${missing.map((c) => c.path).join(', ')}`,
    );
  });

  it('enables ewurk-firstboot via chroot_local-hooks', async () => {
    const hook = await hookEnablesFirstbootService();
    assert.equal(hook.ok, true, hook.detail);
  });

  it('documents offline first-boot behavior in overlay README', async () => {
    const readme = await readFile(
      `${packageRoot()}/image/overlay/usr/share/doc/ewurk-firstboot/README`,
      'utf8',
    );
    assert.match(readme, /offline/i);
    assert.match(readme, /ewurk-firstboot\.service/);
  });
});
