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

  create(_input: { donationId: number; model: string; serial: string }): Device {
    throw new Error('not implemented: SqliteDeviceStore.create');
  }

  getById(_id: number): Device | null {
    throw new Error('not implemented: SqliteDeviceStore.getById');
  }

  getByAssetTag(_assetTag: string): Device | null {
    throw new Error('not implemented: SqliteDeviceStore.getByAssetTag');
  }

  findBySerial(_serial: string): Device | null {
    throw new Error('not implemented: SqliteDeviceStore.findBySerial');
  }

  listByDonation(_donationId: number): Device[] {
    throw new Error('not implemented: SqliteDeviceStore.listByDonation');
  }

  listAll(): Device[] {
    throw new Error('not implemented: SqliteDeviceStore.listAll');
  }

  updateStatus(_id: number, _status: DeviceStatus, _wipe?: WipeInput): Device {
    throw new Error('not implemented: SqliteDeviceStore.updateStatus');
  }

  setReplacesLink(_deviceId: number, _replacesDeviceId: number): void {
    throw new Error('not implemented: SqliteDeviceStore.setReplacesLink');
  }

  appendEvent(_deviceId: number, _eventType: string, _actor: string, _note?: string): DeviceEvent {
    throw new Error('not implemented: SqliteDeviceStore.appendEvent');
  }

  listEvents(_deviceId: number): DeviceEvent[] {
    throw new Error('not implemented: SqliteDeviceStore.listEvents');
  }
}
