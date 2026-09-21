import type { DatabaseSync } from 'node:sqlite';
import type { Donation, DonationStatus } from '../../domain/types.js';
import type { DonationStore } from '../../ports/donation.js';

/**
 * STUB — implemented by T2. Real implementation notes:
 * - Table: donations(id, donor_org, pickup_date, status, created_at).
 * - create: INSERT with status='scheduled', created_at = new Date().toISOString();
 *   return the row via `getById(info.lastInsertRowid as number)`.
 * - getById: SELECT by id, map snake_case columns to the camelCase
 *   `Donation` type (donorOrg, pickupDate, createdAt), return null if missing.
 * - list: SELECT * ORDER BY id DESC, map each row.
 * - updateStatus: UPDATE status, return the updated row via getById; throw
 *   `new AppError('NOT_FOUND')` (import from '../../http/errors.js') if
 *   the id does not exist.
 */
export class SqliteDonationStore implements DonationStore {
  constructor(private db: DatabaseSync) {}

  create(_input: { donorOrg: string; pickupDate: string }): Donation {
    throw new Error('not implemented: SqliteDonationStore.create');
  }

  getById(_id: number): Donation | null {
    throw new Error('not implemented: SqliteDonationStore.getById');
  }

  list(): Donation[] {
    throw new Error('not implemented: SqliteDonationStore.list');
  }

  updateStatus(_id: number, _status: DonationStatus): Donation {
    throw new Error('not implemented: SqliteDonationStore.updateStatus');
  }
}
