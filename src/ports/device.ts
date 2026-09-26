import type { Device, DeviceEvent, DeviceStatus } from '../domain/types.js';

/**
 * `viaLease` is set only by LeaseService. A device may enter or leave
 * `leased` only on that path, so custody records and device status never
 * disagree.
 */
export interface TransitionOptions {
  viaLease?: boolean;
}

export interface WipeInput {
  wipeMethod: string;
  wipeDate: string;
  wipeOperator: string;
}

/** Full store, implemented by SqliteDeviceStore and consumed only by DeviceService. */
export interface DeviceStore {
  create(input: { donationId: number; model: string; serial: string }): Device;
  getById(id: number): Device | null;
  getByAssetTag(assetTag: string): Device | null;
  findBySerial(serial: string): Device | null;
  listByDonation(donationId: number): Device[];
  listAll(): Device[];
  updateStatus(id: number, status: DeviceStatus, wipe?: WipeInput): Device;
  setReplacesLink(deviceId: number, replacesDeviceId: number): void;
  appendEvent(deviceId: number, eventType: string, actor: string, note?: string): DeviceEvent;
  listEvents(deviceId: number): DeviceEvent[];
}

/**
 * Narrow port for consumers that only need to read a device and drive it
 * through the one guarded transition entry point — never a raw status
 * write. LeaseService depends on this, not on DeviceStore, so it
 * structurally cannot bypass the wipe gate.
 */
export interface DeviceLifecyclePort {
  getById(deviceId: number): Device | null;
  getByAssetTag(assetTag: string): Device | null;
  transitionDevice(
    deviceId: number,
    to: DeviceStatus,
    actor: string,
    payload?: Partial<WipeInput>,
    options?: TransitionOptions,
  ): Device;
  /** Records a replaces/replaced-by link between two devices (not a status change). */
  setReplacesLink(deviceId: number, replacesDeviceId: number): void;
}
