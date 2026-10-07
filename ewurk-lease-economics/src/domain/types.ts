export type ShopInputs = {
  label?: string;
  parts_cents: number;
  labor_minutes: number;
  labor_cents_per_hour: number;
  units_donated: number;
  units_reach_available: number;
  swap_repair_cents: number;
  monthly_lease_cents: number;
};

export type RecoveryResult = {
  total_refurb_cents_per_donated: number;
  cost_cents_per_available: number;
  months_to_recover: number;
  months_after_swap: number;
  policy_reminder: string;
};
