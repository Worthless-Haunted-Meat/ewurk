import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { loadImageManifest, loadImageManifestFromJson } from '../src/manifest/load.js';
import { validateImageManifest } from '../src/manifest/schema.js';
import { manifestPath } from '../src/paths.js';
import {
  checkPackagePolicy,
  parsePackageList,
} from '../src/verify/packages.js';

describe('image/manifest.json', () => {
  it('loads from disk and matches the schema', async () => {
    const manifest = await loadImageManifest(manifestPath());
    assert.equal(manifest.architecture, 'amd64');
    assert.equal(manifest.desktop, 'xfce');
    assert.ok(manifest.forbiddenPackages.includes('ubuntu-report'));
    assert.ok(manifest.forbiddenPackages.includes('snapd'));
  });

  it('rejects invalid semver version', () => {
    const { errors } = validateImageManifest({
      version: 'not-semver',
      codename: 'x',
      baseSuite: 'bookworm',
      architecture: 'amd64',
      desktop: 'xfce',
      requiredPackages: ['a'],
      forbiddenPackages: ['b'],
      firmwarePackages: ['c'],
      firstBootVersion: '0.1.0',
    });
    assert.ok(errors.some((e) => e.field === 'version'));
  });
});

describe('package policy', () => {
  it('fails when a forbidden package appears in a fixture list', () => {
    const manifest = loadImageManifestFromJson(
      JSON.stringify({
        version: '1.0.0',
        codename: 'test',
        baseSuite: 'bookworm',
        architecture: 'amd64',
        desktop: 'xfce',
        requiredPackages: ['xfce4'],
        forbiddenPackages: ['ubuntu-report', 'snapd'],
        firmwarePackages: ['firmware-linux-nonfree'],
        firstBootVersion: '0.1.0',
      }),
    );

    const violations = checkPackagePolicy(manifest, ['xfce4', 'snapd', 'ubuntu-report']);
    const forbidden = violations.filter((v) => v.kind === 'forbidden').map((v) => v.packageName);
    assert.deepEqual(forbidden.sort(), ['snapd', 'ubuntu-report']);
  });

  it('passes desktop.list against the committed manifest', async () => {
    const manifest = await loadImageManifest();
    const listText = await readFile(
      new URL('../image/lists/desktop.list', import.meta.url),
      'utf8',
    );
    const packages = parsePackageList(listText);
    const violations = checkPackagePolicy(manifest, packages);
    assert.equal(violations.length, 0);
  });
});
