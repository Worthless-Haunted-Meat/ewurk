import type { DatabaseSync } from 'node:sqlite';
import { openDb } from './db/connection.js';
import { createApp } from './app.js';
import type { AppDeps } from './deps.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { SystemClock } from './adapters/clock/SystemClock.js';
import { SqliteUserStore, SqliteTokenStore, SqliteSessionStore } from './adapters/sqlite/authAdapters.js';
import { createMailerFromEnv } from './adapters/mail/createMailer.js';
import { SqliteDonationStore } from './adapters/sqlite/SqliteDonationStore.js';
import { SqliteDeviceStore } from './adapters/sqlite/SqliteDeviceStore.js';
import { SqliteLeaseStore, SqlitePaymentStore } from './adapters/sqlite/leasePaymentAdapters.js';
import { SqliteFamilyStore, SqliteClassStore } from './adapters/sqlite/familyClassAdapters.js';
import { AuthService } from './services/authService.js';
import { DonationService } from './services/donationService.js';
import { DeviceService } from './services/deviceService.js';
import { LeaseService, PaymentService } from './services/leaseService.js';
import { FamilyService } from './services/familyService.js';
import { ClassService } from './services/classService.js';

/**
 * Builds every real adapter/service against an already-open db handle.
 * Exported separately from buildDeps() so callers that also need raw SQL
 * access (src/seed.ts, for the read-only `users` table which has no
 * "create user" use case in v1) can share the same handle instead of
 * opening the database twice.
 */
export function buildDepsFromDb(db: DatabaseSync): AppDeps {
  const clock = new SystemClock();
  const users = new SqliteUserStore(db);
  const tokens = new SqliteTokenStore(db);
  const sessions = new SqliteSessionStore(db);
  const { mailer } = createMailerFromEnv();
  const publicOrigin = process.env.EWURK_PUBLIC_URL?.trim() ?? 'http://localhost:3000';
  const donations = new SqliteDonationStore(db);
  const devices = new SqliteDeviceStore(db);
  const leases = new SqliteLeaseStore(db);
  const payments = new SqlitePaymentStore(db);
  const families = new SqliteFamilyStore(db);
  const classes = new SqliteClassStore(db);

  const authService = new AuthService(users, tokens, sessions, mailer, clock, publicOrigin);
  const donationService = new DonationService(donations, devices, clock);
  const deviceService = new DeviceService(devices, clock);
  const leaseService = new LeaseService(leases, deviceService, families, clock);
  const paymentService = new PaymentService(payments, leases, clock);
  const familyService = new FamilyService(families, leases, deviceService, paymentService, classes, clock);
  const classService = new ClassService(classes, leases, families);

  return {
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
    devOutboxEnabled: process.env.NODE_ENV !== 'production',
  };
}

export function buildDeps(): { deps: AppDeps; db: DatabaseSync } {
  const dbPath = process.env.EWURK_DB_PATH ?? 'data/ewurk.db';
  const db = openDb(dbPath);
  return { deps: buildDepsFromDb(db), db };
}

function main(): void {
  const { deps } = buildDeps();
  const app = createApp(deps);
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`EWURK listening on http://localhost:${port}`);
  });
}

// Only start the server when this file is the CLI entry point (so that
// `import { buildDeps } from './server.js'` in src/seed.ts / tests never
// triggers a real HTTP listener as a side effect). `resolve()` alone is
// not enough here: it normalizes a path string but does not resolve
// symlinks, so on a checkout under a symlinked temp dir (e.g. macOS's
// /tmp -> /private/tmp, /var -> /private/var) `process.argv[1]` and
// `import.meta.url` can each be reported through a different symlink
// alias for the *same* file, making a strict string comparison fail —
// which would silently skip `main()` and leave the process listening on
// nothing, exactly the "process starts, never answers" failure mode this
// guard must not produce. Resolve both sides to their real path before
// comparing, and if that check can't be completed for any reason, fail
// open (start the server) rather than fail closed (silently don't).
if (process.argv[1]) {
  try {
    const invoked = realpathSync(resolve(process.argv[1]));
    const thisFile = realpathSync(fileURLToPath(import.meta.url));
    if (invoked === thisFile) {
      main();
    }
  } catch {
    main();
  }
}
