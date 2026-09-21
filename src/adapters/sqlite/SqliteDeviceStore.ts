import type { DatabaseSync } from 'node:sqlite';
import type { Device, DeviceEvent, DeviceStatus } from '../../domain/types.js';
import type { DeviceStore, WipeInput } from '../../ports/device.js';

/**
 * STUB — implemented by T3. Real implementation notes:
 * - Table: devices(id, asset_tag UNIQUE, donation_id, model, serial,
 *   status, wipe_method, wipe_date, wipe_operator, replaces_device_id,
 *   replaced_by_device_id, created_at). Table: device_events(id, device_id,
 *   event_type, actor, note, created_at).
 * - create: mint the asset tag as `EW-` + the next id zero-padded to 4
 *   digits, e.g. `EW-0007`. Since id is AUTOINCREMENT, INSERT the row
 *   first with a placeholder asset_tag (e.g. NULL is not allowed — insert
 *   with the row id already known via `db.prepare(...).run()` then
 *   `info.lastInsertRowid`, then UPDATE asset_tag = 'EW-' + String(id).padStart(4,'0')).
 *   `node:sqlite`'s `DatabaseSync` has no `.transaction()` helper; two
 *   sequential statements is fine here (single-threaded, synchronous, no
 *   concurrent writer). status defaults to
 *   'received'. Return the final row via getById.
 * - getById / getByAssetTag / findBySerial: SELECT by the matching column,
 *   map snake_case -> camelCase (assetTag, donationId, wipeMethod,
 *   wipeDate, wipeOperator, replacesDeviceId, replacedByDeviceId,
 *   createdAt), null fields stay null. Return null if no row.
 * - listByDonation: SELECT * WHERE donation_id = ? ORDER BY id.
 * - listAll: SELECT * ORDER BY id.
 * - updateStatus: UPDATE status (and wipe_method/wipe_date/wipe_operator
 *   when `wipe` is passed) WHERE id = ?; return the updated row via
 *   getById. This is called ONLY from DeviceService.transitionDevice —
 *   never call it from anywhere else.
 * - setReplacesLink: UPDATE devices SET replaces_device_id = ?
 *   WHERE id = deviceId, and UPDATE devices SET replaced_by_device_id =
 *   deviceId WHERE id = replacesDeviceId (two sequential statements; see
 *   the note in `create()` above about `db.transaction` not existing here).
 * - appendEvent / listEvents: straightforward INSERT / SELECT ... ORDER BY
 *   created_at, id.
 */
export class SqliteDeviceStore implements DeviceStore {
  constructor(private db: DatabaseSync) {}

  create(input: { donationId: number; model: string; serial: string }): Device {
    this.db
      .prepare(
        'INSERT INTO devices (asset_tag, donation_id, model, serial, status, created_at) ' +
          'VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
      )
      .run(
        'EW-PLACEHOLDER',
        input.donationId,
        input.model,
        input.serial,
        'received',
      );
    const id = this.db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
    const padded = String(id.id).padStart(4, '0');
    this.db
      .prepare('UPDATE devices SET asset_tag = ? WHERE id = ?')
      .run(`EW-${padded}`, id.id);
    return this.getById(id.id)!;
  }

  getById(id: number): Device | null {
    return mapDevice(this.db.prepare(QUERY_BY_ID).get(id) as Record<string, unknown> | undefined);
  }

  getByAssetTag(assetTag: string): Device | null {
    return mapDevice(this.db.prepare(QUERY_BY_ASSET_TAG).get(assetTag) as Record<string, unknown> | undefined);
  }

  findBySerial(serial: string): Device | null {
    return mapDevice(this.db.prepare(QUERY_BY_SERIAL).get(serial) as Record<string, unknown> | undefined);
  }

  listByDonation(donationId: number): Device[] {
    const rows = this.db.prepare(LIST_BY_DONATION).all(donationId) as Record<string, unknown>[];
    return rows.map((r) => mapDevice(r)!);
  }

  listAll(): Device[] {
    const rows = this.db.prepare(LIST_ALL).all() as Record<string, unknown>[];
    return rows.map((r) => mapDevice(r)!);
  }

  updateStatus(id: number, status: DeviceStatus, wipe?: WipeInput): Device {
    if (wipe) {
      this.db
        .prepare(
          'UPDATE devices SET status = ?, wipe_method = ?, wipe_date = ?, wipe_operator = ? WHERE id = ?',
        )
        .run(status, wipe.wipeMethod, wipe.wipeDate, wipe.wipeOperator, id);
    } else {
      this.db.prepare('UPDATE devices SET status = ? WHERE id = ?').run(status, id);
    }
    return this.getById(id)!;
  }

  setReplacesLink(deviceId: number, replacesDeviceId: number): void {
    this.db
      .prepare('UPDATE devices SET replaces_device_id = ? WHERE id = ?')
      .run(replacesDeviceId, deviceId);
    this.db
      .prepare('UPDATE devices SET replaced_by_device_id = ? WHERE id = ?')
      .run(deviceId, replacesDeviceId);
  }

  appendEvent(deviceId: number, eventType: string, actor: string, note?: string): DeviceEvent {
    this.db
      .prepare(
        'INSERT INTO device_events (device_id, event_type, actor, note, created_at) ' +
          'VALUES (?, ?, ?, ?, datetime(\'now\'))',
      )
      .run(deviceId, eventType, actor, note ?? null);
    const eventId = this.db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
    return this.listEvents(deviceId).find((e) => e.id === eventId.id)!;
  }

  listEvents(deviceId: number): DeviceEvent[] {
    const rows = this.db.prepare(LIST_EVENTS).all(deviceId) as Record<string, unknown>[];
    return rows.map(mapEvent);
  }
}

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

const QUERY_BY_ID =
  'SELECT id, asset_tag, donation_id, model, serial, status, ' +
  'wipe_method, wipe_date, wipe_operator, replaces_device_id, ' +
  'replaced_by_device_id, created_at FROM devices WHERE id = ?';

const QUERY_BY_ASSET_TAG =
  'SELECT id, asset_tag, donation_id, model, serial, status, ' +
  'wipe_method, wipe_date, wipe_operator, replaces_device_id, ' +
  'replaced_by_device_id, created_at FROM devices WHERE asset_tag = ?';

const QUERY_BY_SERIAL =
  'SELECT id, asset_tag, donation_id, model, serial, status, ' +
  'wipe_method, wipe_date, wipe_operator, replaces_device_id, ' +
  'replaced_by_device_id, created_at FROM devices WHERE serial = ?';

const LIST_BY_DONATION =
  'SELECT id, asset_tag, donation_id, model, serial, status, ' +
  'wipe_method, wipe_date, wipe_operator, replaces_device_id, ' +
  'replaced_by_device_id, created_at FROM devices ' +
  'WHERE donation_id = ? ORDER BY id';

const LIST_ALL =
  'SELECT id, asset_tag, donation_id, model, serial, status, ' +
  'wipe_method, wipe_date, wipe_operator, replaces_device_id, ' +
  'replaced_by_device_id, created_at FROM devices ORDER BY id';

const LIST_EVENTS =
  'SELECT id, device_id, event_type, actor, note, created_at ' +
  'FROM device_events WHERE device_id = ? ORDER BY created_at, id';

// ---------------------------------------------------------------------------
// Row → domain type mapping (snake_case DB → camelCase domain)
// ---------------------------------------------------------------------------

function mapDevice(row: Record<string, unknown> | undefined): Device | null {
  if (!row) return null;
  return {
    id: row.id as number,
    assetTag: row.asset_tag as string,
    donationId: row.donation_id as number,
    model: row.model as string,
    serial: row.serial as string,
    status: row.status as DeviceStatus,
    wipeMethod: (row.wipe_method as string | null) ?? null,
    wipeDate: (row.wipe_date as string | null) ?? null,
    wipeOperator: (row.wipe_operator as string | null) ?? null,
    replacesDeviceId: (row.replaces_device_id as number | null) ?? null,
    replacedByDeviceId: (row.replaced_by_device_id as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapEvent(row: Record<string, unknown>): DeviceEvent {
  return {
    id: row.id as number,
    deviceId: row.device_id as number,
    eventType: row.event_type as string,
    actor: row.actor as string,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
