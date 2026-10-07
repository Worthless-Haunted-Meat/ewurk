import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { loadImageManifestFromJson } from '../src/manifest/load.js';
import {
  checkTelemetryPolicy,
  parseTelemetryPolicy,
} from '../src/verify/telemetry.js';

const manifestJson = {
  version: '1.0.0',
  codename: 'test',
  baseSuite: 'bookworm',
  architecture: 'amd64',
  desktop: 'xfce',
  requiredPackages: ['xfce4'],
  forbiddenPackages: ['ubuntu-report', 'snapd', 'apport'],
  firmwarePackages: ['firmware-linux-nonfree'],
  firstBootVersion: '0.1.0',
};

describe('telemetry policy', () => {
  it('flags forbidden packages from the manifest in fixture lists', () => {
    const manifest = loadImageManifestFromJson(JSON.stringify(manifestJson));
    const policy = parseTelemetryPolicy({ forbiddenServices: [], forbiddenPaths: [] });
    const violations = checkTelemetryPolicy(
      manifest,
      policy,
      ['xfce4', 'snapd'],
      [],
      [],
    );
    assert.ok(violations.some((v) => v.kind === 'forbidden-package' && v.name === 'snapd'));
  });

  it('flags forbidden services and paths from static policy fixtures', () => {
    const manifest = loadImageManifestFromJson(JSON.stringify(manifestJson));
    const policyText = readFile(
      new URL('../image/policy/telemetry-policy.json', import.meta.url),
      'utf8',
    );
    return policyText.then((text) => {
      const policy = parseTelemetryPolicy(JSON.parse(text));
      const violations = checkTelemetryPolicy(
        manifest,
        policy,
        ['xfce4'],
        ['snapd.service', 'network-manager.service'],
        ['/etc/cron.daily/popularity-contest'],
      );
      assert.ok(violations.some((v) => v.name === 'snapd.service'));
      assert.ok(violations.some((v) => v.name === '/etc/cron.daily/popularity-contest'));
      assert.ok(!violations.some((v) => v.name === 'network-manager.service'));
    });
  });

  it('passes a clean fixture package and service list', async () => {
    const manifest = await readFile(
      new URL('../image/manifest.json', import.meta.url),
      'utf8',
    ).then((t) => loadImageManifestFromJson(t));
    const policy = parseTelemetryPolicy(
      JSON.parse(
        await readFile(
          new URL('../image/policy/telemetry-policy.json', import.meta.url),
          'utf8',
        ),
      ),
    );
    const desktopList = await readFile(
      new URL('../image/lists/desktop.list', import.meta.url),
      'utf8',
    );
    const packages = desktopList
      .split('\n')
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter(Boolean);
    const violations = checkTelemetryPolicy(manifest, policy, packages, [], []);
    const pkgViolations = violations.filter((v) => v.kind === 'forbidden-package');
    assert.deepEqual(pkgViolations, []);
  });
});
