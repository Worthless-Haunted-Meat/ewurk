import type { Device, Lease, LeaseDevice, Payment, PaymentStatus } from '../domain/types.js';
import type { LeaseStore, PaymentStore } from '../ports/lease.js';
import type { DeviceLifecyclePort } from '../ports/device.js';
import type { FamilyStore } from '../ports/family.js';
import type { Clock } from '../ports/clock.js';
import { AppError } from '../http/errors.js';
import { addMonthsISO, monthsCovered } from '../domain/money.js';

/**
 * Service layer for lease CRUD, swap, and custody chain.
 *
 * createLease(familyId, assetTag, actor):
 *   1. Families.getById(familyId) — throw NOT_FOUND if missing.
 *   2. deviceLifecycle.getByAssetTag(assetTag) — throw NOT_FOUND if missing.
 *   3. leases.findActiveByFamily(familyId); throw DUPLICATE_ACTIVE_LEASE if one exists.
 *   4. deviceLifecycle.transitionDevice(device.id, 'leased', actor) —
 *      catch INVALID_TRANSITION -> DEVICE_NOT_AVAILABLE.
 *   5. leases.create({familyId, startDate: clock.todayISO()}).
 *   6. leases.addCustody(lease.id, device.id, clock.todayISO()).
 *   Return the lease.
 *
 * swap(leaseId, newAssetTag, actor):
 *   1. leases.getById(leaseId) — NOT_FOUND if missing.
 *   2. deviceLifecycle.getByAssetTag(newAssetTag) — NOT_FOUND if missing.
 *   3. leases.getCurrentDeviceId(leaseId) — the outgoing device.
 *   4. deviceLifecycle.transitionDevice(newDevice.id, 'leased', actor),
 *      catching INVALID_TRANSITION -> DEVICE_NOT_AVAILABLE.
 *   5. deviceLifecycle.transitionDevice(outgoingDeviceId, 'repair', actor).
 *   6. leases.endCustody(leaseId, outgoingDeviceId, clock.todayISO()).
 *   7. leases.addCustody(leaseId, newDevice.id, clock.todayISO()).
 *   8. deviceLifecycle.setReplacesLink(newDevice.id, outgoingDeviceId).
 *   Return the lease unchanged.
 *
 * getCustodyChain(leaseId):
 *   leases.listCustody(leaseId), map each row to include assetTag
 *   via deviceLifecycle.getById(row.deviceId).
 *
 * getFamilyLeases(familyId):
 *   leases.listByFamily(familyId).
 *
 * getCurrentDevice(leaseId):
 *   leases.getCurrentDeviceId(leaseId), then deviceLifecycle.getById(id),
 *   or null.
 */
export class LeaseService {
  constructor(
    private leases: LeaseStore,
    private deviceLifecycle: DeviceLifecyclePort,
    private families: FamilyStore,
    private clock: Clock,
  ) {}

  createLease(familyId: number, assetTag: string, actor: string): Lease {
    const family = this.families.getById(familyId);
    if (!family) throw new AppError('NOT_FOUND');

    const device = this.deviceLifecycle.getByAssetTag(assetTag);
    if (!device) throw new AppError('NOT_FOUND');

    const existing = this.leases.findActiveByFamily(familyId);
    if (existing) throw new AppError('DUPLICATE_ACTIVE_LEASE');

    try {
      this.deviceLifecycle.transitionDevice(device.id, 'leased', actor);
    } catch (err) {
      if (err instanceof AppError && err.code === 'INVALID_TRANSITION') {
        throw new AppError('DEVICE_NOT_AVAILABLE');
      }
      throw err;
    }

    const lease = this.leases.create({ familyId, startDate: this.clock.todayISO() });
    this.leases.addCustody(lease.id, device.id, this.clock.todayISO());
    return lease;
  }

  swap(leaseId: number, newAssetTag: string, actor: string): Lease {
    const lease = this.leases.getById(leaseId);
    if (!lease) throw new AppError('NOT_FOUND');

    const newDevice = this.deviceLifecycle.getByAssetTag(newAssetTag);
    if (!newDevice) throw new AppError('NOT_FOUND');

    const outgoingDeviceId = this.leases.getCurrentDeviceId(leaseId);
    if (outgoingDeviceId === null) throw new AppError('NOT_FOUND');

    try {
      this.deviceLifecycle.transitionDevice(newDevice.id, 'leased', actor);
    } catch (err) {
      if (err instanceof AppError && err.code === 'INVALID_TRANSITION') {
        throw new AppError('DEVICE_NOT_AVAILABLE');
      }
      throw err;
    }

    this.deviceLifecycle.transitionDevice(outgoingDeviceId, 'repair', actor);
    this.leases.endCustody(leaseId, outgoingDeviceId, this.clock.todayISO());
    this.leases.addCustody(leaseId, newDevice.id, this.clock.todayISO());
    this.deviceLifecycle.setReplacesLink(newDevice.id, outgoingDeviceId);

    return lease;
  }

  getCustodyChain(leaseId: number): Array<LeaseDevice & { assetTag: string }> {
    const custodies = this.leases.listCustody(leaseId);
    return custodies.map((c) => {
      const device = this.deviceLifecycle.getById(c.deviceId);
      return {
        ...c,
        assetTag: device?.assetTag ?? '',
      };
    });
  }

  getFamilyLeases(familyId: number): Lease[] {
    return this.leases.listByFamily(familyId);
  }

  getCurrentDevice(leaseId: number): Device | null {
    const deviceId = this.leases.getCurrentDeviceId(leaseId);
    if (deviceId === null) return null;
    return this.deviceLifecycle.getById(deviceId);
  }
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  paidThroughDate: string;
  totalPaidCents: number;
}

/**
 * Service layer for payment recording and hardship pause.
 *
 * recordPayment(leaseId, amountCents, paidDate):
 *   1. leases.getById(leaseId) — NOT_FOUND if missing.
 *   2. If amountCents <= 0 throw VALIDATION with 'Payment amount must be greater than zero.'.
 *   3. payments.record({leaseId, amountCents, paidDate}).
 *   Return the payment.
 *
 * getStatus(leaseId):
 *   1. leases.getById(leaseId) — NOT_FOUND if missing.
 *   2. payments.listByLease(leaseId), sum amountCents -> totalPaidCents.
 *   3. paidThroughDate = addMonthsISO(lease.startDate, monthsCovered(totalPaidCents)).
 *   4. If lease.hardshipPaused -> status = 'paused'.
 *   5. Else if paidThroughDate < clock.todayISO() (string compare) -> 'behind'.
 *   6. Else -> 'current'.
 *   Return { status, paidThroughDate, totalPaidCents }.
 *
 * setHardshipPause(leaseId, paused):
 *   1. leases.getById(leaseId) — NOT_FOUND if missing.
 *   2. leases.setHardshipPaused(leaseId, paused).
 *   Return the lease.
 */
export class PaymentService {
  constructor(
    private payments: PaymentStore,
    private leases: LeaseStore,
    private clock: Clock,
  ) {}

  recordPayment(leaseId: number, amountCents: number, paidDate: string): Payment {
    const lease = this.leases.getById(leaseId);
    if (!lease) throw new AppError('NOT_FOUND');

    if (amountCents <= 0) {
      throw new AppError('VALIDATION', 'Payment amount must be greater than zero.');
    }

    return this.payments.record({ leaseId, amountCents, paidDate });
  }

  getStatus(leaseId: number): PaymentStatusResult {
    const lease = this.leases.getById(leaseId);
    if (!lease) throw new AppError('NOT_FOUND');

    const paymentsList = this.payments.listByLease(leaseId);
    const totalPaidCents = paymentsList.reduce((sum, p) => sum + p.amountCents, 0);

    const paidThroughDate = addMonthsISO(lease.startDate, monthsCovered(totalPaidCents));

    let status: PaymentStatus;
    if (lease.hardshipPaused) {
      status = 'paused';
    } else if (paidThroughDate < this.clock.todayISO()) {
      // String compare works for YYYY-MM-DD
      status = 'behind';
    } else {
      status = 'current';
    }

    return { status, paidThroughDate, totalPaidCents };
  }

  setHardshipPause(leaseId: number, paused: boolean): Lease {
    const lease = this.leases.getById(leaseId);
    if (!lease) throw new AppError('NOT_FOUND');

    return this.leases.setHardshipPaused(leaseId, paused);
  }
}
