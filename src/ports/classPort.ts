import type { ClassSession, AttendanceRecord } from '../domain/types.js';

export interface ClassStore {
  createSession(input: { sessionDate: string; topic: string }): ClassSession;
  getSession(id: number): ClassSession | null;
  listSessions(): ClassSession[];
  upsertAttendance(sessionId: number, familyId: number, present: boolean): AttendanceRecord;
  listAttendance(sessionId: number): AttendanceRecord[];
  listAttendanceByFamily(
    familyId: number,
  ): Array<AttendanceRecord & { sessionDate: string; topic: string }>;
}
