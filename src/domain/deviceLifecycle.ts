import type { DeviceStatus } from './types.js';

/**
 * The only place the device lifecycle graph is defined. `wiped` is
 * unskippable on the happy path (triaged -> wiped -> refurbished ->
 * imaged -> available), and DeviceService.transitionDevice additionally
 * re-checks the wipe fields directly on the transition into `available`
 * (see DESIGN.md §4) so the gate holds even if this graph changes later.
 */
export const NEXT_STATUSES: Record<DeviceStatus, DeviceStatus[]> = {
  received: ['triaged'],
  triaged: ['wiped', 'retired'],
  wiped: ['refurbished'],
  refurbished: ['imaged', 'retired'],
  imaged: ['available'],
  available: ['leased'],
  leased: ['returned', 'repair'],
  returned: ['triaged', 'retired'],
  repair: ['refurbished', 'retired'],
  retired: [],
};

export function nextStatuses(from: DeviceStatus): DeviceStatus[] {
  return NEXT_STATUSES[from];
}

export function canTransition(from: DeviceStatus, to: DeviceStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

export const WIPE_FIELDS = ['wipeMethod', 'wipeDate', 'wipeOperator'] as const;
