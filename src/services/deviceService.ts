import type { Device, DeviceEvent, DeviceStatus } from '../domain/types.js';
import type { DeviceStore, DeviceLifecyclePort, WipeInput } from '../ports/device.js';
import type { Clock } from '../ports/clock.js';
import { AppError } from '../http/errors.js';
import { canTransition } from '../domain/deviceLifecycle.js';

/**
 * Implements the one guarded device‑lifecycle entry point described in
 * DESIGN.md §4: NOT_FOUND → INVALID_TRANSITION → WIPE_FIELDS_REQUIRED
 * (into wiped) → WIPE_REQUIRED (into available, runs every time) →
 * persist transition + event.
 */
export class DeviceService implements DeviceLifecyclePort {
  constructor(
    private devices: DeviceStore,
    private clock: Clock,
  ) {}

  getById(deviceId: number): Device | null {
    return this.devices.getById(deviceId);
  }

  getByAssetTag(assetTag: string): Device | null {
    return this.devices.getByAssetTag(assetTag);
  }

  transitionDevice(
    deviceId: number,
    to: DeviceStatus,
    actor: string,
    payload?: Partial<WipeInput>,
  ): Device {
    // 1. NOT_FOUND
    const device = this.devices.getById(deviceId);
    if (!device) throw new AppError('NOT_FOUND');

    // 2. INVALID_TRANSITION
    if (!canTransition(device.status, to)) {
      throw new AppError('INVALID_TRANSITION');
    }

    // 3. WIPE_FIELDS_REQUIRED — entering wiped
    if (to === 'wiped') {
      if (!payload?.wipeMethod || !payload?.wipeDate || !payload?.wipeOperator) {
        throw new AppError('WIPE_FIELDS_REQUIRED');
      }
    }

    // 4. WIPE_REQUIRED — entering available (runs every time, regardless of
    //    current status — catches data‑integrity edges where a device
    //    somehow reaches imaged/available without a wipe record).
    if (to === 'available') {
      if (!device.wipeMethod || !device.wipeDate || !device.wipeOperator) {
        throw new AppError('WIPE_REQUIRED');
      }
    }

    // 5. Persist the transition
    const wipedPayload = to === 'wiped' ? (payload as WipeInput) : undefined;
    const updated = this.devices.updateStatus(deviceId, to, wipedPayload);

    // 6. Log the timeline event
    this.devices.appendEvent(deviceId, to, actor);

    return updated;
  }

  getTimeline(deviceId: number): { device: Device; events: DeviceEvent[] } {
    const device = this.devices.getById(deviceId);
    if (!device) throw new AppError('NOT_FOUND');
    const events = this.devices.listEvents(deviceId);
    return { device, events };
  }

  searchBySerial(serial: string): Device | null {
    return this.devices.findBySerial(serial);
  }

  setReplacesLink(deviceId: number, replacesDeviceId: number): void {
    this.devices.setReplacesLink(deviceId, replacesDeviceId);
  }
}
