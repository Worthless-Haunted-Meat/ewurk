import type { Clock } from './ports/clock.js';
import type { UserStore, TokenStore, SessionStore, Mailer, AuthServicePort } from './ports/auth.js';
import type { DonationStore } from './ports/donation.js';
import type { DeviceStore } from './ports/device.js';
import type { LeaseStore, PaymentStore } from './ports/lease.js';
import type { FamilyStore } from './ports/family.js';
import type { ClassStore } from './ports/classPort.js';
import type { DonationService } from './services/donationService.js';
import type { DeviceService } from './services/deviceService.js';
import type { LeaseService, PaymentService } from './services/leaseService.js';
import type { FamilyService } from './services/familyService.js';
import type { ClassService } from './services/classService.js';

/**
 * The composition root's dependency bag. Every port and every service is
 * built once (in src/server.ts for real, in test/helpers/testApp.ts for
 * fakes) and passed down; nothing under src/http reaches for a concrete
 * adapter class directly.
 */
export interface AppDeps {
  clock: Clock;
  users: UserStore;
  tokens: TokenStore;
  sessions: SessionStore;
  mailer: Mailer;
  donations: DonationStore;
  devices: DeviceStore;
  leases: LeaseStore;
  payments: PaymentStore;
  families: FamilyStore;
  classes: ClassStore;
  authService: AuthServicePort;
  donationService: DonationService;
  deviceService: DeviceService;
  leaseService: LeaseService;
  paymentService: PaymentService;
  familyService: FamilyService;
  classService: ClassService;
  devOutboxEnabled: boolean;
}
