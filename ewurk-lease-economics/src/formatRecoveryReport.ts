import type { RecoveryResult, ShopInputs } from './domain/types.js';

export function formatRecoveryReport(inputs: ShopInputs, result: RecoveryResult): string {
  const label = inputs.label ?? '(none)';
  const lines = [
    `label: ${label}`,
    `cost_cents_per_available: ${result.cost_cents_per_available}`,
    `months_to_recover: ${result.months_to_recover}`,
    `total_refurb_cents_per_donated: ${result.total_refurb_cents_per_donated}`,
    `monthly_lease_cents: ${inputs.monthly_lease_cents}`,
    '',
    result.policy_reminder,
  ];
  return `${lines.join('\n')}\n`;
}
