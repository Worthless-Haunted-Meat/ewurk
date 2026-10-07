import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecovery, shopInputsWithDefaults } from '../src/domain/recovery.js';
import { unitsNotReachingAvailable, yieldScenarioNote } from '../src/domain/scenarios.js';
import { formatRecoveryReport } from '../src/formatRecoveryReport.js';

describe('yield and swap scenarios (fixture math)', () => {
  test('yield dilutes cost when 1 of 5 never reaches available', () => {
    const inputs = shopInputsWithDefaults({
      label: 'fixture-yield-m5',
      parts_cents: 1000,
      labor_minutes: 0,
      labor_cents_per_hour: 0,
      units_donated: 5,
      units_reach_available: 4,
      swap_repair_cents: 0,
    });
    assert.equal(unitsNotReachingAvailable(inputs), 1);
    const result = computeRecovery(inputs);
    // 1000 per donated × 5 = 5000 batch; /4 available = 1250
    assert.equal(result.cost_cents_per_available, 1250);
    assert.equal(result.months_to_recover, 1);
    assert.match(yieldScenarioNote(inputs), /batch dilution/);
  });

  test('swap_repair_cents increases months_after_swap', () => {
    const inputs = shopInputsWithDefaults({
      label: 'fixture-swap-m5',
      parts_cents: 6000,
      labor_minutes: 0,
      labor_cents_per_hour: 0,
      units_donated: 1,
      units_reach_available: 1,
      swap_repair_cents: 4500,
    });
    const result = computeRecovery(inputs);
    assert.equal(result.cost_cents_per_available, 6000);
    assert.equal(result.months_to_recover, 3);
    assert.equal(result.months_after_swap, 6);

    const report = formatRecoveryReport(inputs, result);
    assert.match(report, /months_after_swap: 6/);
    assert.match(report, /swap_repair_cents: 4500/);
    assert.doesNotMatch(report, /disable|lockout recommendation/i);
  });
});
