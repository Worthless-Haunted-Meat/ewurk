import type { DatabaseSync } from 'node:sqlite';
import type { Lease, LeaseDevice, Payment } from '../../domain/types.js';
import type { LeaseStore, PaymentStore } from '../../ports/lease.js';

/**
 * STUB — implemented by T4. Real implementation notes:
 * - Tables: leases(id, family_id, start_date, status, hardship_paused
 *   INTEGER 0/1, created_at); lease_devices(id, lease_id, device_id,
 *   started_at, ended_at).
 * - create: INSERT status='active', hardship_paused=0; return via getById.
 * - getById: SELECT by id, map hardship_paused (0/1) -> boolean.
 * - findActiveByFamily: SELECT * WHERE family_id = ? AND status = 'active'
 *   LIMIT 1; null if none.
 * - listByFamily: SELECT * WHERE family_id = ? ORDER BY id.
 * - listAll: SELECT * ORDER BY id.
 * - setHardshipPaused: UPDATE hardship_paused = ? WHERE id = ?; return via getById.
 * - addCustody: INSERT INTO lease_devices(lease_id, device_id, started_at,
 *   ended_at) VALUES (?, ?, ?, NULL); return the row.
 * - endCustody: UPDATE lease_devices SET ended_at = ? WHERE lease_id = ?
 *   AND device_id = ? AND ended_at IS NULL; return the updated row.
 * - listCustody: SELECT * FROM lease_devices WHERE lease_id = ? ORDER BY started_at, id.
 * - getCurrentDeviceId: SELECT device_id FROM lease_devices WHERE
 *   lease_id = ? AND ended_at IS NULL LIMIT 1; null if none.
 */
export class SqliteLeaseStore implements LeaseStore {
  constructor(private db: DatabaseSync) {}

  create(_input: { familyId: number; startDate: string }): Lease {
    throw new Error('not implemented: SqliteLeaseStore.create');
  }

  getById(_id: number): Lease | null {
    throw new Error('not implemented: SqliteLeaseStore.getById');
  }

  findActiveByFamily(_familyId: number): Lease | null {
    throw new Error('not implemented: SqliteLeaseStore.findActiveByFamily');
  }

  listByFamily(_familyId: number): Lease[] {
    throw new Error('not implemented: SqliteLeaseStore.listByFamily');
  }

  listAll(): Lease[] {
    throw new Error('not implemented: SqliteLeaseStore.listAll');
  }

  setHardshipPaused(_id: number, _paused: boolean): Lease {
    throw new Error('not implemented: SqliteLeaseStore.setHardshipPaused');
  }

  addCustody(_leaseId: number, _deviceId: number, _startedAt: string): LeaseDevice {
    throw new Error('not implemented: SqliteLeaseStore.addCustody');
  }

  endCustody(_leaseId: number, _deviceId: number, _endedAt: string): LeaseDevice {
    throw new Error('not implemented: SqliteLeaseStore.endCustody');
  }

  listCustody(_leaseId: number): LeaseDevice[] {
    throw new Error('not implemented: SqliteLeaseStore.listCustody');
  }

  getCurrentDeviceId(_leaseId: number): number | null {
    throw new Error('not implemented: SqliteLeaseStore.getCurrentDeviceId');
  }
}

/**
 * STUB — implemented by T4. Real implementation notes:
 * - Table: payments(id, lease_id, amount_cents, paid_date, created_at).
 * - record: INSERT, return via a SELECT by lastInsertRowid.
 * - listByLease: SELECT * WHERE lease_id = ? ORDER BY paid_date, id.
 */
export class SqlitePaymentStore implements PaymentStore {
  constructor(private db: DatabaseSync) {}

  record(_input: { leaseId: number; amountCents: number; paidDate: string }): Payment {
    throw new Error('not implemented: SqlitePaymentStore.record');
  }

  listByLease(_leaseId: number): Payment[] {
    throw new Error('not implemented: SqlitePaymentStore.listByLease');
  }
}
