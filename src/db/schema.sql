-- EWURK schema. No value/price/cost column exists anywhere (R4 holds by
-- construction). No ssn/bank/income column exists on families (R22 holds
-- by construction).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'volunteer', 'instructor')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_org TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'received', 'acknowledged')) DEFAULT 'scheduled',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag TEXT NOT NULL UNIQUE,
  donation_id INTEGER NOT NULL REFERENCES donations(id),
  model TEXT NOT NULL,
  serial TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'received', 'triaged', 'wiped', 'refurbished', 'imaged',
    'available', 'leased', 'returned', 'repair', 'retired'
  )) DEFAULT 'received',
  wipe_method TEXT,
  wipe_date TEXT,
  wipe_operator TEXT,
  replaces_device_id INTEGER REFERENCES devices(id),
  replaced_by_device_id INTEGER REFERENCES devices(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  neighborhood TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL REFERENCES families(id),
  start_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')) DEFAULT 'active',
  hardship_paused INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lease_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lease_id INTEGER NOT NULL REFERENCES leases(id),
  device_id INTEGER NOT NULL REFERENCES devices(id),
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lease_id INTEGER NOT NULL REFERENCES leases(id),
  amount_cents INTEGER NOT NULL,
  paid_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES class_sessions(id),
  family_id INTEGER NOT NULL REFERENCES families(id),
  present INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, family_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_donation ON devices(donation_id);
CREATE INDEX IF NOT EXISTS idx_device_events_device ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_leases_family ON leases(family_id);
CREATE INDEX IF NOT EXISTS idx_lease_devices_lease ON lease_devices(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_family ON attendance(family_id);
