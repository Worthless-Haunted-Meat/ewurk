import type { AttendanceRecord, ClassSession, Family } from '../domain/types.js';
import type { ClassStore } from '../ports/classPort.js';
import type { LeaseStore } from '../ports/lease.js';
import type { FamilyStore } from '../ports/family.js';

/**
 * STUB — implemented by T5. Real implementation notes:
 * - createSession(sessionDate, topic): `classes.createSession({sessionDate, topic})`.
 * - buildRoster(sessionId): `classes.getSession(sessionId)` (NOT_FOUND if
 *   missing). `leases.listAll()`, filter `status === 'active'`, map to
 *   `familyId`, dedupe. For each, `families.getById(familyId)` and
 *   `classes.upsertAttendance(sessionId, familyId, false)` (roster seeds
 *   attendance as not-yet-marked-present). Return the list of Family
 *   objects rostered (families with no active lease are never included — R17).
 * - markAttendance(sessionId, familyId, present): `classes.getSession(sessionId)`
 *   (NOT_FOUND if missing), `classes.upsertAttendance(sessionId, familyId, present)`.
 * - listSessions / getSession: pass straight through to the store.
 */
export class ClassService {
  constructor(
    private classes: ClassStore,
    private leases: LeaseStore,
    private families: FamilyStore,
  ) {}

  createSession(_sessionDate: string, _topic: string): ClassSession {
    throw new Error('not implemented: ClassService.createSession');
  }

  buildRoster(_sessionId: number): Family[] {
    throw new Error('not implemented: ClassService.buildRoster');
  }

  markAttendance(_sessionId: number, _familyId: number, _present: boolean): AttendanceRecord {
    throw new Error('not implemented: ClassService.markAttendance');
  }

  listSessions(): ClassSession[] {
    throw new Error('not implemented: ClassService.listSessions');
  }

  getSession(_id: number): ClassSession | null {
    throw new Error('not implemented: ClassService.getSession');
  }
}
