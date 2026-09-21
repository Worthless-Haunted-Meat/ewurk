import type { DatabaseSync } from 'node:sqlite';
import type { Donation, DonationStatus } from '../../domain/types.js';
import type { DonationStore } from '../../ports/donation.js';
import { AppError } from '../../http/errors.js';

/**
 * SQLite-backed DonationStore using `node:sqlite` `DatabaseSync`.
 *
 * Table schema (created by the application before first use):
 *
 *   CREATE TABLE donations (
 *     id          INTEGER PRIMARY KEY AUTOINCREMENT,
 *     donor_org   TEXT NOT NULL,
 *     pickup_date TEXT NOT NULL,
 *     status      TEXT NOT NULL DEFAULT 'scheduled',
 *     created_at  TEXT NOT NULL
 *   );
 *
 * Column conventions:
 * - `created_at` stores an ISO-8601 string (UTC).
 * - `status` is `scheduled | received | acknowledged`.
 *
 * Public API (DonationStore):
 * - `create({ donorOrg, pickupDate })` — inserts a row with status
 *   `'scheduled'`, `created_at` = current ISO timestamp; returns the row
 *   via `getById(lastInsertRowid)`.
 * - `getById(id)` — SELECT * FROM donations WHERE id = ?; returns null
 *   when the row is missing.  Maps `donor_org → donorOrg`,
 *   `pickup_date → pickupDate`, `created_at → createdAt`.
 * - `list()` — SELECT * ORDER BY id DESC; maps every row identically
 *   to `getById`.
 * - `updateStatus(id, status)` — UPDATE status, return the updated row
 *   via `getById`; throws `AppError('NOT_FOUND')` if the id does not
 *   exist.
 */
export class SqliteDonationStore implements DonationStore {
  constructor(private db: DatabaseSync) {}

  create(input: { donorOrg: string; pickupDate: string }): Donation {
    this.db.run(
      `INSERT INTO donations (donor_org, pickup_date, status, created_at)
       VALUES (?, ?, 'scheduled', ?)`,
      input.donorOrg,
      input.pickupDate,
      new Date().toISOString(),
    );
    return this.getById(this.db.lastInsertRowid as number)!;
  }

  getById(id: number): Donation | null {
    const row = this.db.get(
      `SELECT id, donor_org, pickup_date, status, created_at
       FROM donations WHERE id = ?`,
      id,
    ) as {
      id: number;
      donor_org: string;
      pickup_date: string;
      status: DonationStatus;
      created_at: string;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      donorOrg: row.donor_org,
      pickupDate: row.pickup_date,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  list(): Donation[] {
    const rows = this.db.all(
      `SELECT id, donor_org, pickup_date, status, created_at
       FROM donations ORDER BY id DESC`,
    ) as Array<{
      id: number;
      donor_org: string;
      pickup_date: string;
      status: DonationStatus;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      donorOrg: row.donor_org,
      pickupDate: row.pickup_date,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  updateStatus(id: number, status: DonationStatus): Donation {
    const existing = this.db.get(
      `SELECT id FROM donations WHERE id = ?`,
      id,
    ) as { id: number } | undefined;
    if (!existing) {
      throw new AppError('NOT_FOUND');
    }
    this.db.run(`UPDATE donations SET status = ? WHERE id = ?`, status, id);
    return this.getById(id)!;
  }
}
