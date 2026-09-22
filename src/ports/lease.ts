import type { Lease, LeaseDevice, Payment } from '../domain/types.js';

export interface LeaseStore {
  create(input: { familyId: number; startDate: string }): Lease;
  getById(id: number): Lease | null;
  findActiveByFamily(familyId: number): Lease | null;
  listByFamily(familyId: number): Lease[];
  listAll(): Lease[];
  setHardshipPaused(id: number, paused: boolean): Lease;
  addCustody(leaseId: number, deviceId: number, startedAt: string): LeaseDevice;
  endCustody(leaseId: number, deviceId: number, endedAt: string): LeaseDevice;
  listCustody(leaseId: number): LeaseDevice[];
  getCurrentDeviceId(leaseId: number): number | null;
}

export interface PaymentStore {
  record(input: { leaseId: number; amountCents: number; paidDate: string }): Payment;
  listByLease(leaseId: number): Payment[];
}
