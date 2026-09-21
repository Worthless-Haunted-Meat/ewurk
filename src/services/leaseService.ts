import type { Device, Lease, LeaseDevice, Payment, PaymentStatus } from '../domain/types.js';
import type { LeaseStore, PaymentStore } from '../ports/lease.js';
import type { DeviceLifecyclePort } from '../ports/device.js';
import type { FamilyStore } from '../ports/family.js';
import type { Clock } from '../ports/clock.js';

/**
 * STUB — implemented by T4. Real implementation notes (see DESIGN.md §3, §4):
 * - createLease(familyId, assetTag, actor): `families.getById(familyId)`,
 *   throw NOT_FOUND if missing. `deviceLifecycle.getByAssetTag(assetTag)`,
 *   throw NOT_FOUND if missing. `leases.findActiveByFamily(familyId)`;
 *   throw `new AppError('DUPLICATE_ACTIVE_LEASE')` if one exists. Try
 *   `deviceLifecycle.transitionDevice(device.id, 'leased', actor)` inside a
 *   try/catch — if it throws (device not 'available', i.e.
 *   INVALID_TRANSITION), re-throw as `new AppError('DEVICE_NOT_AVAILABLE')`.
 *   `leases.create({familyId, startDate: clock.todayISO()})`, then
 *   `leases.addCustody(lease.id, device.id, clock.todayISO())`. Return the lease.
 * - swap(leaseId, newAssetTag, actor): `leases.getById(leaseId)` (NOT_FOUND
 *   if missing). `deviceLifecycle.getByAssetTag(newAssetTag)` (NOT_FOUND if
 *   missing). `leases.getCurrentDeviceId(leaseId)` — the outgoing device.
 *   Try `deviceLifecycle.transitionDevice(newDevice.id, 'leased', actor)`,
 *   catching INVALID_TRANSITION -> `DEVICE_NOT_AVAILABLE`. Then
 *   `deviceLifecycle.transitionDevice(outgoingDeviceId, 'repair', actor)`.
 *   `leases.endCustody(leaseId, outgoingDeviceId, clock.todayISO())`,
 *   `leases.addCustody(leaseId, newDevice.id, clock.todayISO())`. Then
 *   `deviceLifecycle.setReplacesLink(newDevice.id, outgoingDeviceId)` so
 *   `GET /devices/:assetTag` can show "replaces EW-xxxx" on the incoming
 *   device and "replaced by EW-yyyy" on the outgoing one (R10/R11). Return
 *   the lease unchanged (its start_date/status are never touched by a swap).
 * - getCustodyChain(leaseId): `leases.listCustody(leaseId)`, map each row
 *   to include `assetTag` via `deviceLifecycle.getById(row.deviceId)`.
 * - getFamilyLeases(familyId): `leases.listByFamily(familyId)`.
 * - getCurrentDevice(leaseId): `leases.getCurrentDeviceId(leaseId)`, then
 *   `deviceLifecycle.getById(id)`, or null if no current device.
 */
export class LeaseService {
  constructor(
    private leases: LeaseStore,
    private deviceLifecycle: DeviceLifecyclePort,
    private families: FamilyStore,
    private clock: Clock,
  ) {}

  createLease(_familyId: number, _assetTag: string, _actor: string): Lease {
    throw new Error('not implemented: LeaseService.createLease');
  }

  swap(_leaseId: number, _newAssetTag: string, _actor: string): Lease {
    throw new Error('not implemented: LeaseService.swap');
  }

  getCustodyChain(_leaseId: number): Array<LeaseDevice & { assetTag: string }> {
    throw new Error('not implemented: LeaseService.getCustodyChain');
  }

  getFamilyLeases(_familyId: number): Lease[] {
    throw new Error('not implemented: LeaseService.getFamilyLeases');
  }

  getCurrentDevice(_leaseId: number): Device | null {
    throw new Error('not implemented: LeaseService.getCurrentDevice');
  }
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  paidThroughDate: string;
  totalPaidCents: number;
}

/**
 * STUB — implemented by T4. Real implementation notes:
 * - recordPayment(leaseId, amountCents, paidDate): `leases.getById(leaseId)`
 *   (NOT_FOUND if missing). If `amountCents <= 0` throw
 *   `new AppError('VALIDATION', 'Payment amount must be greater than zero.')`.
 *   `payments.record({leaseId, amountCents, paidDate})`.
 * - getStatus(leaseId): `leases.getById(leaseId)` (NOT_FOUND if missing).
 *   `payments.listByLease(leaseId)`, sum amountCents ->  totalPaidCents.
 *   `import { monthsCovered, addMonthsISO } from '../domain/money.js'`;
 *   `paidThroughDate = addMonthsISO(lease.startDate, monthsCovered(totalPaidCents))`.
 *   If `lease.hardshipPaused` -> status = 'paused'. Else if
 *   `paidThroughDate < clock.todayISO()` (string compare works for
 *   'YYYY-MM-DD') -> status = 'behind'. Else -> status = 'current'.
 * - setHardshipPause(leaseId, paused): `leases.getById(leaseId)` (NOT_FOUND
 *   if missing), `leases.setHardshipPaused(leaseId, paused)`.
 */
export class PaymentService {
  constructor(
    private payments: PaymentStore,
    private leases: LeaseStore,
    private clock: Clock,
  ) {}

  recordPayment(_leaseId: number, _amountCents: number, _paidDate: string): Payment {
    throw new Error('not implemented: PaymentService.recordPayment');
  }

  getStatus(_leaseId: number): PaymentStatusResult {
    throw new Error('not implemented: PaymentService.getStatus');
  }

  setHardshipPause(_leaseId: number, _paused: boolean): Lease {
    throw new Error('not implemented: PaymentService.setHardshipPause');
  }
}
