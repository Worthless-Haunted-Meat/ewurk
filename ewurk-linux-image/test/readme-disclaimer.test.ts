import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { packageRoot } from '../src/paths.js';

/** Stable markers checked by CI — keep in sync with README wipe/USB section. */
export const README_DISCLAIMER_MARKERS = [
  'EWURK-WIPE-DISCLAIMER',
  'NIST wipe',
  'recorded in EWURK before imaging',
  'imaging does not make a device `available`',
  'DEVICE=/dev/sd',
  'scripts/write-usb.sh',
] as const;

describe('README wipe and USB disclaimer', () => {
  it('contains required disclaimer phrases', async () => {
    const readme = await readFile(`${packageRoot()}/README.md`, 'utf8');
    for (const marker of README_DISCLAIMER_MARKERS) {
      assert.ok(
        readme.includes(marker),
        `README.md must include marker: ${marker}`,
      );
    }
  });
});
