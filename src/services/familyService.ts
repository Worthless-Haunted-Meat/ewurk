import type { Family, FamilySummary } from '../domain/types.js';
import type { FamilyStore } from '../ports/family.js';
import type { LeaseStore } from '../ports/lease.js';
import type { DeviceLifecyclePort } from '../ports/device.js';
import type { ClassStore } from '../ports/classPort.js';
import type { Clock } from '../ports/clock.js';
import type { PaymentService } from './leaseService.js';
import { AppError } from '../http/errors.js';

/**
 * Service layer for family CRUD and the one-screen family summary.
 *
 * createFamily(input): only read `input.name`, `input.contact`,
 *   `input.neighborhood` — never spread the whole object — then
 *   `families.create({name, contact, neighborhood})` (R22).
 * search(query): `families.search(query)`.
 * getSummary(familyId): `families.getById(familyId)` (NOT_FOUND if
 *   missing). `leases.findActiveByFamily(familyId)` -> activeLease (or
 *   null). If activeLease:
 *   - `leases.getCurrentDeviceId(activeLease.id)`, then
 *     `deviceLifecycle.getById(id)` -> currentDevice (or null if no
 *     current device id);
 *   - `payments.getStatus(activeLease.id)` -> paymentStatus
 *     `{status, paidThroughDate}`.
 *   - If no activeLease, currentDevice = null, paymentStatus = null.
 *   `classes.listAttendanceByFamily(familyId)` mapped to
 *   `{sessionDate, topic, present}`. Return the full `FamilySummary`.
 *   This is the R19 one-screen view — every field above is populated in
 *   one call, no follow-up request.
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

  createFamily(input: { name: string; contact: string; neighborhood?: string }): Family {
    return this.families.create({ name: input.name, contact: input.contact, neighborhood: input.neighborhood });
  }

  search(query: string): Family[] {
    return this.families.search(query);
  }

  getSummary(familyId: number): FamilySummary {
    const family = this.families.getById(familyId);
    if (!family) throw new AppError('NOT_FOUND');

    const activeLease = this.leases.findActiveByFamily(familyId);

    if (!activeLease) {
      const attendance = this.classes
        .listAttendanceByFamily(familyId)
        .map((a) => ({ sessionDate: a.sessionDate, topic: a.topic, present: a.present }));
      return { family, activeLease: null, currentDevice: null, paymentStatus: null, attendance };
    }

    const currentDeviceId = this.leases.getCurrentDeviceId(activeLease.id);
    const currentDevice = currentDeviceId !== null ? this.deviceLifecycle.getById(currentDeviceId) : null;
    const paymentStatus = this.payments.getStatus(activeLease.id);

    const attendance = this.classes
      .listAttendanceByFamily(familyId)
      .map((a) => ({ sessionDate: a.sessionDate, topic: a.topic, present: a.present }));

    return { family, activeLease, currentDevice, paymentStatus, attendance };
  }
}
