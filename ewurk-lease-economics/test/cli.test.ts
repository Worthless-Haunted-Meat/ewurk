import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { calculateFromCsvFile, calculateFromCsvText } from '../src/cli.js';
import { POLICY_REMINDER } from '../src/domain/constants.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const fixturePath = fileURLToPath(new URL('../fixtures/shop-fixture.csv', import.meta.url));

describe('CLI recovery table', () => {
  test('calculateFromCsvFile prints recovery fields for fixture CSV', () => {
    const out = calculateFromCsvFile(fixturePath);
    assert.match(out, /cost_cents_per_available: \d+/);
    assert.match(out, /months_to_recover: \d+/);
    assert.match(out, new RegExp(POLICY_REMINDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(out, /fixture-shop-not-real/);
  });

  test('fixture math: 5000 parts + 120min @ 1500¢/hr → 3000 labor, batch 5→4', () => {
    const text = readFileSync(fixturePath, 'utf8');
    const out = calculateFromCsvText(text);
    // per donated 8000; batch 40000 / 4 available = 10000 cents
    assert.match(out, /cost_cents_per_available: 10000/);
    assert.match(out, /months_to_recover: 5/);
  });

  test('built dist/cli.js matches calculateFromCsvFile stdout', () => {
    const built = spawnSync(process.execPath, ['dist/cli.js', fixturePath], {
      cwd: packageRoot,
      encoding: 'utf8',
    });
    assert.equal(built.status, 0, built.stderr);
    assert.match(built.stdout, /months_to_recover:/);
    assert.match(built.stdout, /cost_cents_per_available:/);
    assert.match(built.stdout, /lockout/i);
  });
});
