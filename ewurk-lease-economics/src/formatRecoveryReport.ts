import { yieldScenarioNote } from './domain/scenarios.js';
import type { RecoveryResult, ShopInputs } from './domain/types.js';

export function formatRecoveryReport(inputs: ShopInputs, result: RecoveryResult): string {
  const label = inputs.label ?? '(none)';
  const lines = [
    `label: ${label}`,
    `units_donated: ${inputs.units_donated}`,
    `units_reach_available: ${inputs.units_reach_available}`,
    yieldScenarioNote(inputs),
    `cost_cents_per_available: ${result.cost_cents_per_available}`,
    `months_to_recover: ${result.months_to_recover}`,
    `total_refurb_cents_per_donated: ${result.total_refurb_cents_per_donated}`,
    `monthly_lease_cents: ${inputs.monthly_lease_cents}`,
  ];

  if (inputs.swap_repair_cents > 0) {
    lines.push(`swap_repair_cents: ${inputs.swap_repair_cents}`);
    lines.push(`months_after_swap: ${result.months_after_swap}`);
  }

  lines.push('', result.policy_reminder);
  return `${lines.join('\n')}\n`;
}
