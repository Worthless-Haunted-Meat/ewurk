import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { divRoundHalfUp, monthsToCoverCents } from '../src/domain/money.js';
import {
  computeRecovery,
  costCentsPerAvailable,
  laborCentsPerDonatedUnit,
  monthsToRecover,
  shopInputsWithDefaults,
  totalRefurbCentsPerDonated,
} from '../src/domain/recovery.js';
import { DEFAULT_MONTHLY_LEASE_CENTS } from '../src/domain/constants.js';

describe('money helpers', () => {
  test('divRoundHalfUp uses integer round-half-up', () => {
    assert.equal(divRoundHalfUp(7, 4), 2);
    assert.equal(divRoundHalfUp(8, 4), 2);
    assert.equal(divRoundHalfUp(9, 4), 2);
    assert.equal(divRoundHalfUp(10, 4), 3);
  });

  test('monthsToCoverCents is ceiling months at fixed lease cents', () => {
    assert.equal(monthsToCoverCents(0, 2000), 0);
    assert.equal(monthsToCoverCents(1, 2000), 1);
    assert.equal(monthsToCoverCents(2000, 2000), 1);
    assert.equal(monthsToCoverCents(2001, 2000), 2);
  });
});

describe('recovery (fixture cents only — not shop facts)', () => {
  test('laborCentsPerDonatedUnit from minutes and rate without floats', () => {
    // 90 min × 1200 ¢/hr → 1800 ¢ labor (fixture)
    assert.equal(laborCentsPerDonatedUnit(90, 1200), 1800);
  });

  test('cost_cents_per_available spreads batch yield with round-half-up', () => {
    const perDonated = 5000; // fixture parts+labor per donated unit
    assert.equal(costCentsPerAvailable(perDonated, 5, 4), 6250);
    assert.equal(costCentsPerAvailable(perDonated, 3, 2), 7500);
  });

  test('months_to_recover at default $20/month lease constant', () => {
    assert.equal(monthsToRecover(7500, DEFAULT_MONTHLY_LEASE_CENTS), 4);
    assert.equal(monthsToRecover(8000, DEFAULT_MONTHLY_LEASE_CENTS), 4);
    assert.equal(monthsToRecover(8001, DEFAULT_MONTHLY_LEASE_CENTS), 5);
  });

  test('computeRecovery wires totals for labeled fixture row', () => {
    const inputs = shopInputsWithDefaults({
      label: 'fixture-m2-not-real',
      parts_cents: 3333,
      labor_minutes: 61,
      labor_cents_per_hour: 987,
      units_donated: 7,
      units_reach_available: 5,
      swap_repair_cents: 0,
    });
    const labor = laborCentsPerDonatedUnit(61, 987);
    const perDonated = totalRefurbCentsPerDonated(inputs);
    assert.equal(perDonated, 3333 + labor);

    const result = computeRecovery(inputs);
    assert.equal(result.total_refurb_cents_per_donated, perDonated);
    assert.equal(
      result.cost_cents_per_available,
      costCentsPerAvailable(perDonated, 7, 5),
    );
    assert.equal(
      result.months_to_recover,
      monthsToRecover(result.cost_cents_per_available, DEFAULT_MONTHLY_LEASE_CENTS),
    );
    assert.match(result.policy_reminder, /not grounds for device lockout/i);
  });
});
