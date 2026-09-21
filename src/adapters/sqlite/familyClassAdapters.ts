import type { DatabaseSync } from 'node:sqlite';
import type { Family } from '../../domain/types.js';
import type { FamilyStore } from '../../ports/family.js';
import type { AttendanceRecord, ClassSession } from '../../domain/types.js';
import type { ClassStore } from '../../ports/classPort.js';

/**
 * STUB — implemented by T5. Real implementation notes:
 * - Table: families(id, name, contact, neighborhood, created_at). Only
 *   these three input fields are ever read off `input` — never spread the
 *   whole object into the INSERT (that is what keeps R22 true even if a
 *   caller passes extra keys).
 * - create: INSERT name/contact/neighborhood (neighborhood nullable);
 *   return via getById.
 * - getById: SELECT by id, null if missing.
 * - search: `SELECT * FROM families WHERE name LIKE ? ORDER BY name`
 *   with `%${nameQuery}%`, case-insensitive (SQLite LIKE is
 *   case-insensitive for ASCII by default).
 * - list: SELECT * ORDER BY name.
 */
export class SqliteFamilyStore implements FamilyStore {
  constructor(private db: DatabaseSync) {}

  create(_input: { name: string; contact: string; neighborhood?: string }): Family {
    throw new Error('not implemented: SqliteFamilyStore.create');
  }

  getById(_id: number): Family | null {
    throw new Error('not implemented: SqliteFamilyStore.getById');
  }

  search(_nameQuery: string): Family[] {
    throw new Error('not implemented: SqliteFamilyStore.search');
  }

  list(): Family[] {
    throw new Error('not implemented: SqliteFamilyStore.list');
  }
}

/**
 * STUB — implemented by T5. Real implementation notes:
 * - Tables: class_sessions(id, session_date, topic, created_at);
 *   attendance(id, session_id, family_id, present INTEGER 0/1, UNIQUE(session_id, family_id)).
 * - createSession / getSession / listSessions: straightforward CRUD.
 * - upsertAttendance: `INSERT INTO attendance(session_id, family_id,
 *   present) VALUES (?,?,?) ON CONFLICT(session_id, family_id) DO UPDATE
 *   SET present = excluded.present`, then SELECT the row back.
 * - listAttendance: SELECT * FROM attendance WHERE session_id = ?.
 * - listAttendanceByFamily: JOIN attendance to class_sessions ON
 *   session_id, WHERE family_id = ?, ORDER BY session_date.
 */
export class SqliteClassStore implements ClassStore {
  constructor(private db: DatabaseSync) {}

  createSession(_input: { sessionDate: string; topic: string }): ClassSession {
    throw new Error('not implemented: SqliteClassStore.createSession');
  }

  getSession(_id: number): ClassSession | null {
    throw new Error('not implemented: SqliteClassStore.getSession');
  }

  listSessions(): ClassSession[] {
    throw new Error('not implemented: SqliteClassStore.listSessions');
  }

  upsertAttendance(_sessionId: number, _familyId: number, _present: boolean): AttendanceRecord {
    throw new Error('not implemented: SqliteClassStore.upsertAttendance');
  }

  listAttendance(_sessionId: number): AttendanceRecord[] {
    throw new Error('not implemented: SqliteClassStore.listAttendance');
  }

  listAttendanceByFamily(
    _familyId: number,
  ): Array<AttendanceRecord & { sessionDate: string; topic: string }> {
    throw new Error('not implemented: SqliteClassStore.listAttendanceByFamily');
  }
}
