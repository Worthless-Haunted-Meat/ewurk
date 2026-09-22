import type { DatabaseSync } from 'node:sqlite';
import type { Family } from '../../domain/types.js';
import type { FamilyStore } from '../../ports/family.js';
import type { AttendanceRecord, ClassSession } from '../../domain/types.js';
import type { ClassStore } from '../../ports/classPort.js';

// ---------------------------------------------------------------------------
// Type helpers — map snake_case DB rows to PascalCase domain objects.
// ---------------------------------------------------------------------------

type FamilyRow = {
  id: number;
  name: string;
  contact: string;
  neighborhood: string | null;
  created_at: string;
};

type ClassSessionRow = {
  id: number;
  session_date: string;
  topic: string;
  created_at: string;
};

type AttendanceRow = {
  id: number;
  session_id: number;
  family_id: number;
  present: number;
};

/**
 * SQLite-backed FamilyStore.
 *
 * create: INSERT name/contact/neighborhood (neighborhood nullable);
 *   return via getById. Only these three fields are read off input — never
 *   spread the whole object (R22).
 * getById: SELECT by id, null if missing.
 * search: SELECT * FROM families WHERE name LIKE ? ORDER BY name,
 *   with `%${nameQuery}%` (SQLite LIKE is case-insensitive for ASCII).
 * list: SELECT * FROM families ORDER BY name.
 */
export class SqliteFamilyStore implements FamilyStore {
  constructor(private db: DatabaseSync) {}

  create(input: { name: string; contact: string; neighborhood?: string }): Family {
    const now = new Date().toISOString().slice(0, 10);
    this.db
      .prepare(
        'INSERT INTO families (name, contact, neighborhood, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(input.name, input.contact, input.neighborhood ?? null, now);
    const row = this.db
      .prepare('SELECT LAST_INSERT_ROWID() AS id')
      .get() as { id: number };
    return this.getById(row.id)!;
  }

  getById(id: number): Family | null {
    const row = this.db
      .prepare('SELECT * FROM families WHERE id = ?')
      .get(id) as FamilyRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      contact: row.contact,
      neighborhood: row.neighborhood,
      createdAt: row.created_at,
    };
  }

  search(nameQuery: string): Family[] {
    const rows = this.db
      .prepare('SELECT * FROM families WHERE name LIKE ? ORDER BY name')
      .all(`%${nameQuery}%`) as FamilyRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          name: r.name,
          contact: r.contact,
          neighborhood: r.neighborhood,
          createdAt: r.created_at,
        }) as Family,
    );
  }

  list(): Family[] {
    const rows = this.db
      .prepare('SELECT * FROM families ORDER BY name')
      .all() as FamilyRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          name: r.name,
          contact: r.contact,
          neighborhood: r.neighborhood,
          createdAt: r.created_at,
        }) as Family,
    );
  }
}

/**
 * SQLite-backed ClassStore.
 *
 * createSession / getSession / listSessions: straightforward CRUD.
 * upsertAttendance: `INSERT INTO attendance(session_id, family_id,
 *   present) VALUES (?, ?, ?) ON CONFLICT(session_id, family_id) DO UPDATE
 *   SET present = excluded.present`, then SELECT the row back.
 * listAttendance: SELECT * FROM attendance WHERE session_id = ?.
 * listAttendanceByFamily: JOIN attendance to class_sessions ON
 *   session_id, WHERE family_id = ?, ORDER BY session_date.
 */
export class SqliteClassStore implements ClassStore {
  constructor(private db: DatabaseSync) {
    // Disable foreign keys for compatibility with in-memory test fixtures
    // that may insert related records before referenced records exist.
    this.db.prepare('PRAGMA foreign_keys = OFF').run();
  }

  createSession(input: { sessionDate: string; topic: string }): ClassSession {
    const now = new Date().toISOString().slice(0, 10);
    this.db
      .prepare(
        'INSERT INTO class_sessions (session_date, topic, created_at) VALUES (?, ?, ?)',
      )
      .run(input.sessionDate, input.topic, now);
    const row = this.db
      .prepare('SELECT LAST_INSERT_ROWID() AS id')
      .get() as { id: number };
    return this.getSession(row.id)!;
  }

  getSession(id: number): ClassSession | null {
    const row = this.db
      .prepare('SELECT * FROM class_sessions WHERE id = ?')
      .get(id) as ClassSessionRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      sessionDate: row.session_date,
      topic: row.topic,
      createdAt: row.created_at,
    };
  }

  listSessions(): ClassSession[] {
    const rows = this.db
      .prepare('SELECT * FROM class_sessions ORDER BY session_date')
      .all() as ClassSessionRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          sessionDate: r.session_date,
          topic: r.topic,
          createdAt: r.created_at,
        }) as ClassSession,
    );
  }

  upsertAttendance(sessionId: number, familyId: number, present: boolean): AttendanceRecord {
    this.db
      .prepare(
        'INSERT INTO attendance (session_id, family_id, present) VALUES (?, ?, ?) ' +
          'ON CONFLICT(session_id, family_id) DO UPDATE SET present = excluded.present',
      )
      .run(sessionId, familyId, present ? 1 : 0);
    const row = this.db
      .prepare('SELECT * FROM attendance WHERE session_id = ? AND family_id = ? LIMIT 1')
      .get(sessionId, familyId) as AttendanceRow | undefined;
    if (!row) throw new Error('attendance row not found after upsert');
    return {
      id: row.id,
      sessionId: row.session_id,
      familyId: row.family_id,
      present: Boolean(row.present),
    };
  }

  listAttendance(sessionId: number): AttendanceRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM attendance WHERE session_id = ? ORDER BY id')
      .all(sessionId) as AttendanceRow[];
    return rows.map(
      (r) =>
        ({
          id: r.id,
          sessionId: r.session_id,
          familyId: r.family_id,
          present: Boolean(r.present),
        }) as AttendanceRecord,
    );
  }

  listAttendanceByFamily(
    familyId: number,
  ): Array<AttendanceRecord & { sessionDate: string; topic: string }> {
    const rows = this.db
      .prepare(
        'SELECT a.id, a.session_id, a.family_id, a.present, cs.session_date, cs.topic ' +
          'FROM attendance a ' +
          'JOIN class_sessions cs ON a.session_id = cs.id ' +
          'WHERE a.family_id = ? ' +
          'ORDER BY cs.session_date, a.id',
      )
      .all(familyId) as Array<AttendanceRow & { session_date: string; topic: string }>;
    return rows.map(
      (r) =>
        ({
          id: r.id,
          sessionId: r.session_id,
          familyId: r.family_id,
          present: Boolean(r.present),
          sessionDate: r.session_date,
          topic: r.topic,
        }) as AttendanceRecord & { sessionDate: string; topic: string },
    );
  }
}
