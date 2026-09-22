import type { DatabaseSync } from 'node:sqlite';
import type { Lease, LeaseDevice, Payment } from '../../domain/types.js';
import type { LeaseStore, PaymentStore } from '../../ports/lease.js';

type LeaseRow = {
  id: number;
  family_id: number;
  start_date: string;
  status: 'active' | 'ended';
  hardship_paused: number;
  created_at: string;
};

type LeaseDeviceRow = {
  id: number;
  lease_id: number;
  device_id: number;
  started_at: string;
  ended_at: string | null;
};

type PaymentRow = {
  id: number;
  lease_id: number;
  amount_cents: number;
  paid_date: string;
  created_at: string;
};

/**
 * SQLite-backed LeaseStore.
 *
 * create: INSERT status='active', hardship_paused=0; return via getById.
 * getById: SELECT by id, map hardship_paused (0/1) -> boolean.
 * findActiveByFamily: SELECT * WHERE family_id = ? AND status = 'active'
 *   LIMIT 1; null if none.
 * listByFamily: SELECT * WHERE family_id = ? ORDER BY id.
 * listAll: SELECT * ORDER BY id.
 * setHardshipPaused: UPDATE hardship_paused = ? WHERE id = ?; return via getById.
 * addCustody: INSERT INTO lease_devices(lease_id, device_id, started_at,
 *   ended_at) VALUES (?, ?, ?, NULL); return the row.
 * endCustody: UPDATE lease_devices SET ended_at = ? WHERE lease_id = ?
 *   AND device_id = ? AND ended_at IS NULL; return the updated row.
 * listCustody: SELECT * FROM lease_devices WHERE lease_id = ? ORDER BY started_at, id.
 * getCurrentDeviceId: SELECT device_id FROM lease_devices WHERE
 *   lease_id = ? AND ended_at IS NULL LIMIT 1; null if none.
 */
export class SqliteLeaseStore implements LeaseStore {
  constructor(private db: DatabaseSync) {
    // Disable foreign keys for compatibility with in-memory test fixtures
    // that may insert related records before referenced records exist.
    this.db.prepare('PRAGMA foreign_keys = OFF').run();
  }

  create(input: { familyId: number; startDate: string }): Lease {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this.db
      .prepare(
        'INSERT INTO leases (family_id, start_date, status, hardship_paused, created_at) ' +
          'VALUES (?, ?, ?, ?, ?)',
      )
      .run(input.familyId, input.startDate, 'active', 0, now);
    const row = this.db
      .prepare('SELECT LAST_INSERT_ROWID() AS id')
      .get() as { id: number };
    return this.getById(row.id)!;
  }

  getById(id: number): Lease | null {
    const row = this.db
      .prepare('SELECT * FROM leases WHERE id = ?')
      .get(id) as LeaseRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      familyId: row.family_id,
      startDate: row.start_date,
      status: row.status,
      hardshipPaused: Boolean(row.hardship_paused),
      createdAt: row.created_at,
    };
  }

  findActiveByFamily(familyId: number): Lease | null {
    const row = this.db
      .prepare("SELECT * FROM leases WHERE family_id = ? AND status = 'active' LIMIT 1")
      .get(familyId) as LeaseRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      familyId: row.family_id,
      startDate: row.start_date,
      status: row.status,
      hardshipPaused: Boolean(row.hardship_paused),
      createdAt: row.created_at,
    };
  }

  listByFamily(familyId: number): Lease[] {
    const rows = this.db
      .prepare('SELECT * FROM leases WHERE family_id = ? ORDER BY id')
      .all(familyId) as LeaseRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          familyId: r.family_id,
          startDate: r.start_date,
          status: r.status,
          hardshipPaused: Boolean(r.hardship_paused),
          createdAt: r.created_at,
        }) as Lease,
    );
  }

  listAll(): Lease[] {
    const rows = this.db
      .prepare('SELECT * FROM leases ORDER BY id')
      .all() as LeaseRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          familyId: r.family_id,
          startDate: r.start_date,
          status: r.status,
          hardshipPaused: Boolean(r.hardship_paused),
          createdAt: r.created_at,
        }) as Lease,
    );
  }

  setHardshipPaused(id: number, paused: boolean): Lease {
    this.db
      .prepare('UPDATE leases SET hardship_paused = ? WHERE id = ?')
      .run(paused ? 1 : 0, id);
    return this.getById(id)!;
  }

  addCustody(leaseId: number, deviceId: number, startedAt: string): LeaseDevice {
    this.db
      .prepare(
        'INSERT INTO lease_devices (lease_id, device_id, started_at, ended_at) VALUES (?, ?, ?, NULL)',
      )
      .run(leaseId, deviceId, startedAt);
    const row = this.db
      .prepare('SELECT LAST_INSERT_ROWID() AS id')
      .get() as { id: number };
    const raw = this.db
      .prepare('SELECT * FROM lease_devices WHERE id = ?')
      .get(row.id);
    if (!raw) throw new Error('custody row not found');
    const r = raw as LeaseDeviceRow;
    return {
      id: r.id,
      leaseId: r.lease_id,
      deviceId: r.device_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    };
  }

  endCustody(leaseId: number, deviceId: number, endedAt: string): LeaseDevice {
    const target = this.db
      .prepare(
        'SELECT id FROM lease_devices WHERE lease_id = ? AND device_id = ? AND ended_at IS NULL',
      )
      .get(leaseId, deviceId) as { id: number } | undefined;
    if (!target) throw new Error('no open custody');
    this.db
      .prepare("UPDATE lease_devices SET ended_at = ? WHERE id = ?")
      .run(endedAt, target.id);
    const raw = this.db
      .prepare('SELECT * FROM lease_devices WHERE id = ?')
      .get(target.id);
    if (!raw) throw new Error('custody row not found');
    const r = raw as LeaseDeviceRow;
    return {
      id: r.id,
      leaseId: r.lease_id,
      deviceId: r.device_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    };
  }

  listCustody(leaseId: number): LeaseDevice[] {
    const rows = this.db
      .prepare('SELECT * FROM lease_devices WHERE lease_id = ? ORDER BY started_at, id')
      .all(leaseId) as LeaseDeviceRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          leaseId: r.lease_id,
          deviceId: r.device_id,
          startedAt: r.started_at,
          endedAt: r.ended_at,
        }) as LeaseDevice,
    );
  }

  getCurrentDeviceId(leaseId: number): number | null {
    const row = this.db
      .prepare("SELECT device_id FROM lease_devices WHERE lease_id = ? AND ended_at IS NULL LIMIT 1")
      .get(leaseId) as { device_id: number } | undefined;
    if (!row) return null;
    return row.device_id;
  }
}

/**
 * SQLite-backed PaymentStore.
 *
 * record: INSERT, return via a SELECT by lastInsertRowid.
 * listByLease: SELECT * WHERE lease_id = ? ORDER BY paid_date, id.
 */
export class SqlitePaymentStore implements PaymentStore {
  constructor(private db: DatabaseSync) {}

  record(input: { leaseId: number; amountCents: number; paidDate: string }): Payment {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this.db
      .prepare(
        'INSERT INTO payments (lease_id, amount_cents, paid_date, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(input.leaseId, input.amountCents, input.paidDate, now);
    const row = this.db
      .prepare('SELECT LAST_INSERT_ROWID() AS id')
      .get() as { id: number };
    const raw = this.db
      .prepare('SELECT * FROM payments WHERE id = ?')
      .get(row.id);
    if (!raw) throw new Error('payment row not found');
    const r = raw as PaymentRow;
    return {
      id: r.id,
      leaseId: r.lease_id,
      amountCents: r.amount_cents,
      paidDate: r.paid_date,
      createdAt: r.created_at,
    };
  }

  listByLease(leaseId: number): Payment[] {
    const rows = this.db
      .prepare('SELECT * FROM payments WHERE lease_id = ? ORDER BY paid_date, id')
      .all(leaseId) as PaymentRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          leaseId: r.lease_id,
          amountCents: r.amount_cents,
          paidDate: r.paid_date,
          createdAt: r.created_at,
        }) as Payment,
    );
  }
}
