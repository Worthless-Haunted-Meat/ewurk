import { computeRecovery, costCentsPerAvailable, monthsToRecover } from './recovery.js';
import type { ShopInputs } from './types.js';

export { computeRecovery, costCentsPerAvailable, monthsToRecover };

/** Donated units in the batch that never reached `available` (yield loss). */
export function unitsNotReachingAvailable(inputs: Pick<ShopInputs, 'units_donated' | 'units_reach_available'>): number {
  return inputs.units_donated - inputs.units_reach_available;
}

/**
 * Narrative for yield: batch dilution, not a penalty on any lessee.
 */
export function yieldScenarioNote(inputs: Pick<ShopInputs, 'units_donated' | 'units_reach_available'>): string {
  const lost = unitsNotReachingAvailable(inputs);
  if (lost === 0) {
    return 'yield: all donated units in this row reached available (no batch dilution).';
  }
  return (
    `yield: ${lost} of ${inputs.units_donated} donated unit(s) never reached available; ` +
    'their refurb cost is spread across the units that did (batch dilution—not a lessee penalty).'
  );
}
