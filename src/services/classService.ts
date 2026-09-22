import type { AttendanceRecord, ClassSession, Family } from '../domain/types.js';
import type { ClassStore } from '../ports/classPort.js';
import type { LeaseStore } from '../ports/lease.js';
import type { FamilyStore } from '../ports/family.js';
import { AppError } from '../http/errors.js';

/**
 * Service layer for class sessions and attendance.
 *
 * createSession(sessionDate, topic): `classes.createSession({sessionDate, topic})`.
 * buildRoster(sessionId):
 *   1. `classes.getSession(sessionId)` (NOT_FOUND if missing).
 *   2. `leases.listAll()`, filter `status === 'active'`, map to `familyId`,
 *      dedupe. For each, `families.getById(familyId)` — skip if absent.
 *      `classes.upsertAttendance(sessionId, familyId, false)` (roster seeds
 *      attendance as not-yet-marked-present). Return the list of Family
 *      objects rostered (families with no active lease are never included,
 *      per R17).
 * markAttendance(sessionId, familyId, present):
 *   1. `classes.getSession(sessionId)` (NOT_FOUND if missing);
 *   2. `classes.upsertAttendance(sessionId, familyId, present)`.
 * listSessions / getSession: pass straight through to the store.
 */
export class ClassService {
  constructor(
    private classes: ClassStore,
    private leases: LeaseStore,
    private families: FamilyStore,
  ) {}

  createSession(sessionDate: string, topic: string): ClassSession {
    return this.classes.createSession({ sessionDate, topic });
  }

  buildRoster(sessionId: number): Family[] {
    const session = this.classes.getSession(sessionId);
    if (!session) throw new AppError('NOT_FOUND');
    const activeLeases = this.leases.listAll().filter((l) => l.status === 'active');
    const familyIds = [...new Set(activeLeases.map((l) => l.familyId))];
    const roster: Family[] = [];
    for (const familyId of familyIds) {
      const family = this.families.getById(familyId);
      if (!family) continue;
      this.classes.upsertAttendance(sessionId, familyId, false);
      roster.push(family);
    }
    return roster;
  }

  markAttendance(sessionId: number, familyId: number, present: boolean): AttendanceRecord {
    const session = this.classes.getSession(sessionId);
    if (!session) throw new AppError('NOT_FOUND');
    return this.classes.upsertAttendance(sessionId, familyId, present);
  }

  listSessions(): ClassSession[] {
    return this.classes.listSessions();
  }

  getSession(id: number): ClassSession | null {
    return this.classes.getSession(id);
  }
}
