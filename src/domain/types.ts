export type Role = 'staff' | 'volunteer' | 'instructor';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export type DonationStatus = 'scheduled' | 'received' | 'acknowledged';

export interface Donation {
  id: number;
  donorOrg: string;
  pickupDate: string;
  status: DonationStatus;
  createdAt: string;
}

export type DeviceStatus =
  | 'received'
  | 'triaged'
  | 'wiped'
  | 'refurbished'
  | 'imaged'
  | 'available'
  | 'leased'
  | 'returned'
  | 'repair'
  | 'retired';

export interface Device {
  id: number;
  assetTag: string;
  donationId: number;
  model: string;
  serial: string;
  status: DeviceStatus;
  wipeMethod: string | null;
  wipeDate: string | null;
  wipeOperator: string | null;
  replacesDeviceId: number | null;
  replacedByDeviceId: number | null;
  createdAt: string;
}

export interface DeviceEvent {
  id: number;
  deviceId: number;
  eventType: string;
  actor: string;
  note: string | null;
  createdAt: string;
}

export interface Family {
  id: number;
  name: string;
  contact: string;
  neighborhood: string | null;
  createdAt: string;
}

export type LeaseStatus = 'active' | 'ended';

export interface Lease {
  id: number;
  familyId: number;
  startDate: string;
  status: LeaseStatus;
  hardshipPaused: boolean;
  createdAt: string;
}

export interface LeaseDevice {
  id: number;
  leaseId: number;
  deviceId: number;
  startedAt: string;
  endedAt: string | null;
}

export interface Payment {
  id: number;
  leaseId: number;
  amountCents: number;
  paidDate: string;
  createdAt: string;
}

export type PaymentStatus = 'current' | 'behind' | 'paused';

export interface ClassSession {
  id: number;
  sessionDate: string;
  topic: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: number;
  sessionId: number;
  familyId: number;
  present: boolean;
}

export interface FamilySummary {
  family: Family;
  activeLease: Lease | null;
  currentDevice: Device | null;
  paymentStatus: { status: PaymentStatus; paidThroughDate: string } | null;
  attendance: Array<{ sessionDate: string; topic: string; present: boolean }>;
}
