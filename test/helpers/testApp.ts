import type { AddressInfo } from 'node:net';
import { createApp } from '../../src/app.js';
import type { AppDeps } from '../../src/deps.js';
import type { Clock } from '../../src/ports/clock.js';
import type { UserStore, TokenStore, SessionStore, Mailer, OutboxEntry } from '../../src/ports/auth.js';
import type { DonationStore } from '../../src/ports/donation.js';
import type { DeviceStore, DeviceLifecyclePort, WipeInput } from '../../src/ports/device.js';
import { AppError } from '../../src/http/errors.js';
import { canTransition } from '../../src/domain/deviceLifecycle.js';
import type { LeaseStore, PaymentStore } from '../../src/ports/lease.js';
import type { FamilyStore } from '../../src/ports/family.js';
import type { ClassStore } from '../../src/ports/classPort.js';
import type {
  AttendanceRecord,
  ClassSession,
  Device,
  DeviceEvent,
  DeviceStatus,
  Donation,
  DonationStatus,
  Family,
  Lease,
  LeaseDevice,
  Payment,
  User,
} from '../../src/domain/types.js';
import { AuthService } from '../../src/services/authService.js';
import { DonationService } from '../../src/services/donationService.js';
import { DeviceService } from '../../src/services/deviceService.js';
import { LeaseService, PaymentService } from '../../src/services/leaseService.js';
import { FamilyService } from '../../src/services/familyService.js';
import { ClassService } from '../../src/services/classService.js';

// ---------------------------------------------------------------------------
// A fixed, deterministic clock for tests: 2026-01-15T09:00:00.000Z.
// ---------------------------------------------------------------------------
export class FakeClock implements Clock {
  private date: Date;
  constructor(iso = '2026-01-15T09:00:00.000Z') {
    this.date = new Date(iso);
  }
  now(): Date {
    return this.date;
  }
  todayISO(): string {
    return this.date.toISOString().slice(0, 10);
  }
  set(iso: string): void {
    this.date = new Date(iso);
  }
}

// ---------------------------------------------------------------------------
// In-memory fakes, one per port.
// ---------------------------------------------------------------------------
export class FakeUserStore implements UserStore {
  users: User[] = [];
  findByEmail(email: string): User | null {
    return this.users.find((u) => u.email === email) ?? null;
  }
  getById(id: number): User | null {
    return this.users.find((u) => u.id === id) ?? null;
  }
  list(): User[] {
    return [...this.users];
  }
}

export class FakeTokenStore implements TokenStore {
  tokens: Array<{ userId: number; hash: string; expiresAt: string; usedAt: string | null }> = [];
  issue(userId: number, tokenHash: string, expiresAt: string): void {
    this.tokens.push({ userId, hash: tokenHash, expiresAt, usedAt: null });
  }
  consume(tokenHash: string): number | null {
    const row = this.tokens.find((t) => t.hash === tokenHash);
    if (!row) return null;
    if (row.usedAt) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) return null;
    row.usedAt = new Date().toISOString();
    return row.userId;
  }
}

export class FakeSessionStore implements SessionStore {
  sessions = new Map<string, { userId: number; expiresAt: string }>();
  private nextId = 1;
  create(userId: number, expiresAt: string): string {
    const id = `sess-${this.nextId++}`;
    this.sessions.set(id, { userId, expiresAt });
    return id;
  }
  get(sessionId: string): { userId: number; expiresAt: string } | null {
    return this.sessions.get(sessionId) ?? null;
  }
  destroy(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export class FakeMailer implements Mailer {
  outbox: OutboxEntry[] = [];
  send(to: string, subject: string, body: string): void {
    this.outbox.push({ to, subject, body, sentAt: new Date().toISOString() });
  }
  list(): OutboxEntry[] {
    return [...this.outbox];
  }
}

export class FakeDonationStore implements DonationStore {
  rows: Donation[] = [];
  private nextId = 1;
  create(input: { donorOrg: string; pickupDate: string }): Donation {
    const donation: Donation = {
      id: this.nextId++,
      donorOrg: input.donorOrg,
      pickupDate: input.pickupDate,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    this.rows.push(donation);
    return donation;
  }
  getById(id: number): Donation | null {
    return this.rows.find((d) => d.id === id) ?? null;
  }
  list(): Donation[] {
    return [...this.rows];
  }
  updateStatus(id: number, status: DonationStatus): Donation {
    const row = this.rows.find((d) => d.id === id);
    if (!row) throw new Error('not found');
    row.status = status;
    return row;
  }
}

export class FakeDeviceStore implements DeviceStore {
  rows: Device[] = [];
  events: DeviceEvent[] = [];
  private nextId = 1;
  private nextEventId = 1;
  create(input: { donationId: number; model: string; serial: string }): Device {
    const id = this.nextId++;
    const device: Device = {
      id,
      assetTag: `EW-${String(id).padStart(4, '0')}`,
      donationId: input.donationId,
      model: input.model,
      serial: input.serial,
      status: 'received',
      wipeMethod: null,
      wipeDate: null,
      wipeOperator: null,
      replacesDeviceId: null,
      replacedByDeviceId: null,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(device);
    return device;
  }
  getById(id: number): Device | null {
    return this.rows.find((d) => d.id === id) ?? null;
  }
  getByAssetTag(assetTag: string): Device | null {
    return this.rows.find((d) => d.assetTag === assetTag) ?? null;
  }
  findBySerial(serial: string): Device | null {
    return this.rows.find((d) => d.serial === serial) ?? null;
  }
  listByDonation(donationId: number): Device[] {
    return this.rows.filter((d) => d.donationId === donationId);
  }
  listAll(): Device[] {
    return [...this.rows];
  }
  updateStatus(id: number, status: DeviceStatus, wipe?: WipeInput): Device {
    const row = this.rows.find((d) => d.id === id);
    if (!row) throw new Error('not found');
    row.status = status;
    if (wipe) {
      row.wipeMethod = wipe.wipeMethod;
      row.wipeDate = wipe.wipeDate;
      row.wipeOperator = wipe.wipeOperator;
    }
    return row;
  }
  setReplacesLink(deviceId: number, replacesDeviceId: number): void {
    const incoming = this.rows.find((d) => d.id === deviceId);
    const outgoing = this.rows.find((d) => d.id === replacesDeviceId);
    if (incoming) incoming.replacesDeviceId = replacesDeviceId;
    if (outgoing) outgoing.replacedByDeviceId = deviceId;
  }
  appendEvent(deviceId: number, eventType: string, actor: string, note?: string): DeviceEvent {
    const event: DeviceEvent = {
      id: this.nextEventId++,
      deviceId,
      eventType,
      actor,
      note: note ?? null,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }
  listEvents(deviceId: number): DeviceEvent[] {
    return this.events.filter((e) => e.deviceId === deviceId);
  }
}

export class FakeLeaseStore implements LeaseStore {
  rows: Lease[] = [];
  custody: LeaseDevice[] = [];
  private nextId = 1;
  private nextCustodyId = 1;
  create(input: { familyId: number; startDate: string }): Lease {
    const lease: Lease = {
      id: this.nextId++,
      familyId: input.familyId,
      startDate: input.startDate,
      status: 'active',
      hardshipPaused: false,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(lease);
    return lease;
  }
  getById(id: number): Lease | null {
    return this.rows.find((l) => l.id === id) ?? null;
  }
  findActiveByFamily(familyId: number): Lease | null {
    return this.rows.find((l) => l.familyId === familyId && l.status === 'active') ?? null;
  }
  listByFamily(familyId: number): Lease[] {
    return this.rows.filter((l) => l.familyId === familyId);
  }
  listAll(): Lease[] {
    return [...this.rows];
  }
  setHardshipPaused(id: number, paused: boolean): Lease {
    const row = this.rows.find((l) => l.id === id);
    if (!row) throw new Error('not found');
    row.hardshipPaused = paused;
    return row;
  }
  addCustody(leaseId: number, deviceId: number, startedAt: string): LeaseDevice {
    const row: LeaseDevice = { id: this.nextCustodyId++, leaseId, deviceId, startedAt, endedAt: null };
    this.custody.push(row);
    return row;
  }
  endCustody(leaseId: number, deviceId: number, endedAt: string): LeaseDevice {
    const row = this.custody.find((c) => c.leaseId === leaseId && c.deviceId === deviceId && c.endedAt === null);
    if (!row) throw new Error('not found');
    row.endedAt = endedAt;
    return row;
  }
  listCustody(leaseId: number): LeaseDevice[] {
    return this.custody.filter((c) => c.leaseId === leaseId);
  }
  getCurrentDeviceId(leaseId: number): number | null {
    return this.custody.find((c) => c.leaseId === leaseId && c.endedAt === null)?.deviceId ?? null;
  }
}

export class FakePaymentStore implements PaymentStore {
  rows: Payment[] = [];
  private nextId = 1;
  record(input: { leaseId: number; amountCents: number; paidDate: string }): Payment {
    const payment: Payment = { id: this.nextId++, ...input, createdAt: new Date().toISOString() };
    this.rows.push(payment);
    return payment;
  }
  listByLease(leaseId: number): Payment[] {
    return this.rows.filter((p) => p.leaseId === leaseId);
  }
}

export class FakeFamilyStore implements FamilyStore {
  rows: Family[] = [];
  private nextId = 1;
  create(input: { name: string; contact: string; neighborhood?: string }): Family {
    const family: Family = {
      id: this.nextId++,
      name: input.name,
      contact: input.contact,
      neighborhood: input.neighborhood ?? null,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(family);
    return family;
  }
  getById(id: number): Family | null {
    return this.rows.find((f) => f.id === id) ?? null;
  }
  search(nameQuery: string): Family[] {
    const q = nameQuery.toLowerCase();
    return this.rows.filter((f) => f.name.toLowerCase().includes(q));
  }
  list(): Family[] {
    return [...this.rows];
  }
}

export class FakeClassStore implements ClassStore {
  sessions: ClassSession[] = [];
  attendance: AttendanceRecord[] = [];
  private nextSessionId = 1;
  private nextAttendanceId = 1;
  createSession(input: { sessionDate: string; topic: string }): ClassSession {
    const session: ClassSession = { id: this.nextSessionId++, ...input, createdAt: new Date().toISOString() };
    this.sessions.push(session);
    return session;
  }
  getSession(id: number): ClassSession | null {
    return this.sessions.find((s) => s.id === id) ?? null;
  }
  listSessions(): ClassSession[] {
    return [...this.sessions];
  }
  upsertAttendance(sessionId: number, familyId: number, present: boolean): AttendanceRecord {
    let row = this.attendance.find((a) => a.sessionId === sessionId && a.familyId === familyId);
    if (!row) {
      row = { id: this.nextAttendanceId++, sessionId, familyId, present };
      this.attendance.push(row);
    } else {
      row.present = present;
    }
    return row;
  }
  listAttendance(sessionId: number): AttendanceRecord[] {
    return this.attendance.filter((a) => a.sessionId === sessionId);
  }
  listAttendanceByFamily(familyId: number): Array<AttendanceRecord & { sessionDate: string; topic: string }> {
    return this.attendance
      .filter((a) => a.familyId === familyId)
      .map((a) => {
        const session = this.sessions.find((s) => s.id === a.sessionId);
        return { ...a, sessionDate: session?.sessionDate ?? '', topic: session?.topic ?? '' };
      });
  }
}

/**
 * A DeviceLifecyclePort backed by a FakeDeviceStore, re-implementing the
 * exact contract DESIGN.md §4 documents for DeviceService.transitionDevice
 * (using the real, non-stub domain/deviceLifecycle.canTransition). This
 * lets LeaseService/FamilyService route-level tests exercise real
 * lease/swap/family logic without depending on DeviceService being
 * implemented yet — DeviceService's own behavior is covered directly in
 * test/devices.test.ts.
 */
export class FakeDeviceLifecycle implements DeviceLifecyclePort {
  constructor(private devices: FakeDeviceStore) {}

  getById(deviceId: number) {
    return this.devices.getById(deviceId);
  }

  getByAssetTag(assetTag: string) {
    return this.devices.getByAssetTag(assetTag);
  }

  transitionDevice(deviceId: number, to: DeviceStatus, actor: string, payload?: Partial<WipeInput>) {
    const device = this.devices.getById(deviceId);
    if (!device) throw new AppError('NOT_FOUND');
    if (!canTransition(device.status, to)) throw new AppError('INVALID_TRANSITION');
    if (to === 'wiped') {
      if (!payload?.wipeMethod || !payload?.wipeDate || !payload?.wipeOperator) {
        throw new AppError('WIPE_FIELDS_REQUIRED');
      }
    }
    if (to === 'available' && !(device.wipeMethod && device.wipeDate && device.wipeOperator)) {
      throw new AppError('WIPE_REQUIRED');
    }
    const updated = this.devices.updateStatus(deviceId, to, to === 'wiped' ? (payload as WipeInput) : undefined);
    this.devices.appendEvent(deviceId, to, actor);
    return updated;
  }

  setReplacesLink(deviceId: number, replacesDeviceId: number): void {
    this.devices.setReplacesLink(deviceId, replacesDeviceId);
  }
}

// ---------------------------------------------------------------------------
// Bag of fakes + real services on top of them.
// ---------------------------------------------------------------------------
export interface FakeBag {
  clock: FakeClock;
  users: FakeUserStore;
  tokens: FakeTokenStore;
  sessions: FakeSessionStore;
  mailer: FakeMailer;
  donations: FakeDonationStore;
  devices: FakeDeviceStore;
  leases: FakeLeaseStore;
  payments: FakePaymentStore;
  families: FakeFamilyStore;
  classes: FakeClassStore;
  deps: AppDeps;
}

export function buildFakeDeps(): FakeBag {
  const clock = new FakeClock();
  const users = new FakeUserStore();
  const tokens = new FakeTokenStore();
  const sessions = new FakeSessionStore();
  const mailer = new FakeMailer();
  const donations = new FakeDonationStore();
  const devices = new FakeDeviceStore();
  const leases = new FakeLeaseStore();
  const payments = new FakePaymentStore();
  const families = new FakeFamilyStore();
  const classes = new FakeClassStore();

  // Route-level tests for leases/families use this fake instead of the
  // (still-a-stub-until-T3) real DeviceService, so T4/T5's route tests do
  // not depend on T3 landing first. deps.deviceService (below) stays the
  // real DeviceService, since the device routes test DeviceService itself.
  const deviceLifecycleForLeases = new FakeDeviceLifecycle(devices);

  const authService = new AuthService(users, tokens, sessions, mailer, clock);
  const donationService = new DonationService(donations, devices, clock);
  const deviceService = new DeviceService(devices, clock);
  const leaseService = new LeaseService(leases, deviceLifecycleForLeases, families, clock);
  const paymentService = new PaymentService(payments, leases, clock);
  const familyService = new FamilyService(families, leases, deviceLifecycleForLeases, paymentService, classes, clock);
  const classService = new ClassService(classes, leases, families);

  const deps: AppDeps = {
    clock,
    users,
    tokens,
    sessions,
    mailer,
    donations,
    devices,
    leases,
    payments,
    families,
    classes,
    authService,
    donationService,
    deviceService,
    leaseService,
    paymentService,
    familyService,
    classService,
    devOutboxEnabled: true,
  };

  return { clock, users, tokens, sessions, mailer, donations, devices, leases, payments, families, classes, deps };
}

/** Seeds one user per role directly into the fake user store; returns them. */
export function seedUsers(bag: FakeBag): { staff: User; volunteer: User; instructor: User } {
  const staff: User = { id: 1, email: 'staff@ewurk.org', name: 'Staff One', role: 'staff' };
  const volunteer: User = { id: 2, email: 'volunteer@ewurk.org', name: 'Vera Volunteer', role: 'volunteer' };
  const instructor: User = { id: 3, email: 'instructor@ewurk.org', name: 'Ivan Instructor', role: 'instructor' };
  bag.users.users.push(staff, volunteer, instructor);
  return { staff, volunteer, instructor };
}

/** Logs a user in by pushing a session directly into the fake session store; returns the session id / cookie header value. */
export function loginAs(bag: FakeBag, user: User): string {
  const sessionId = bag.sessions.create(user.id, '2099-01-01T00:00:00.000Z');
  return `ewurk_session=${sessionId}`;
}

export interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

export async function startTestServer(deps: AppDeps): Promise<TestServer> {
  const app = createApp(deps);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
