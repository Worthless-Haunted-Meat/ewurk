import type { Family, FamilySummary } from '../domain/types.js';
import type { FamilyStore } from '../ports/family.js';
import type { LeaseStore } from '../ports/lease.js';
import type { DeviceLifecyclePort } from '../ports/device.js';
import type { ClassStore } from '../ports/classPort.js';
import type { Clock } from '../ports/clock.js';
import type { PaymentService } from './leaseService.js';

/**
 * STUB — implemented by T5. Real implementation notes:
 * - createFamily(input): only read `input.name`, `input.contact`,
 *   `input.neighborhood` — never spread the whole object — then
 *   `families.create({name, contact, neighborhood})` (R22).
 * - search(query): `families.search(query)`.
 * - getSummary(familyId): `families.getById(familyId)` (NOT_FOUND if
 *   missing). `leases.findActiveByFamily(familyId)` -> activeLease (or
 *   null). If activeLease: `leases.getCurrentDeviceId(activeLease.id)`,
 *   then `deviceLifecycle.getById(id)` -> currentDevice (or null if no
 *   current device id); `payments.getStatus(activeLease.id)` ->
 *   paymentStatus `{status, paidThroughDate}`. If no activeLease,
 *   currentDevice = null, paymentStatus = null. `classes.listAttendanceByFamily(familyId)`
 *   mapped to `{sessionDate, topic, present}`. Return the full
 *   `FamilySummary`. This is the R19 one-screen view — every field above
 *   must be populated in one call, no follow-up request.
 */
export class FamilyService {
  constructor(
    private families: FamilyStore,
    private leases: LeaseStore,
    private deviceLifecycle: DeviceLifecyclePort,
    private payments: PaymentService,
    private classes: ClassStore,
    private clock: Clock,
  ) {}

  createFamily(_input: { name: string; contact: string; neighborhood?: string }): Family {
    throw new Error('not implemented: FamilyService.createFamily');
  }

  search(_query: string): Family[] {
    throw new Error('not implemented: FamilyService.search');
  }

  getSummary(_familyId: number): FamilySummary {
    throw new Error('not implemented: FamilyService.getSummary');
  }
}
