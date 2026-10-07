import { DEFAULT_MONTHLY_LEASE_CENTS, POLICY_REMINDER } from './constants.js';
import { divRoundHalfUp, monthsToCoverCents } from './money.js';
import type { RecoveryResult, ShopInputs } from './types.js';

function assertNonNegativeInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

/** Labor cost for one donated unit from integer minutes and cents per hour. */
export function laborCentsPerDonatedUnit(laborMinutes: number, laborCentsPerHour: number): number {
  assertNonNegativeInt('labor_minutes', laborMinutes);
  assertNonNegativeInt('labor_cents_per_hour', laborCentsPerHour);
  if (laborMinutes === 0 || laborCentsPerHour === 0) {
    return 0;
  }
  return divRoundHalfUp(laborMinutes * laborCentsPerHour, 60);
}

export function totalRefurbCentsPerDonated(inputs: Pick<ShopInputs, 'parts_cents' | 'labor_minutes' | 'labor_cents_per_hour'>): number {
  assertNonNegativeInt('parts_cents', inputs.parts_cents);
  const labor = laborCentsPerDonatedUnit(inputs.labor_minutes, inputs.labor_cents_per_hour);
  return inputs.parts_cents + labor;
}

/**
 * Spread batch refurb cost across units that reach `available` (round-half-up).
 */
export function costCentsPerAvailable(
  totalRefurbCentsPerDonated: number,
  unitsDonated: number,
  unitsReachAvailable: number,
): number {
  assertNonNegativeInt('total_refurb_cents_per_donated', totalRefurbCentsPerDonated);
  assertPositiveInt('units_donated', unitsDonated);
  assertPositiveInt('units_reach_available', unitsReachAvailable);
  if (unitsReachAvailable > unitsDonated) {
    throw new Error('units_reach_available cannot exceed units_donated');
  }
  const batchTotal = totalRefurbCentsPerDonated * unitsDonated;
  return divRoundHalfUp(batchTotal, unitsReachAvailable);
}

export function monthsToRecover(costCentsPerAvailableUnit: number, monthlyLeaseCents: number): number {
  return monthsToCoverCents(costCentsPerAvailableUnit, monthlyLeaseCents);
}

export function computeRecovery(inputs: ShopInputs): RecoveryResult {
  assertNonNegativeInt('swap_repair_cents', inputs.swap_repair_cents);
  assertPositiveInt('monthly_lease_cents', inputs.monthly_lease_cents);

  const totalPerDonated = totalRefurbCentsPerDonated(inputs);
  const costPerAvailable = costCentsPerAvailable(
    totalPerDonated,
    inputs.units_donated,
    inputs.units_reach_available,
  );
  const months = monthsToRecover(costPerAvailable, inputs.monthly_lease_cents);

  const costWithSwap = costPerAvailable + inputs.swap_repair_cents;
  const monthsAfterSwap = monthsToRecover(costWithSwap, inputs.monthly_lease_cents);

  return {
    total_refurb_cents_per_donated: totalPerDonated,
    cost_cents_per_available: costPerAvailable,
    months_to_recover: months,
    months_after_swap: monthsAfterSwap,
    policy_reminder: POLICY_REMINDER,
  };
}

export function shopInputsWithDefaults(
  partial: Omit<ShopInputs, 'monthly_lease_cents'> & { monthly_lease_cents?: number },
): ShopInputs {
  return {
    ...partial,
    monthly_lease_cents: partial.monthly_lease_cents ?? DEFAULT_MONTHLY_LEASE_CENTS,
  };
}
