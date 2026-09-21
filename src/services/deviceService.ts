import type { Device, DeviceEvent, DeviceStatus } from '../domain/types.js';
import type { DeviceStore, DeviceLifecyclePort, WipeInput } from '../ports/device.js';
import type { Clock } from '../ports/clock.js';

/**
 * STUB — implemented by T3. Real implementation notes (see DESIGN.md §4,
 * which is the exact algorithm for transitionDevice — follow it in order):
 * - transitionDevice: load device (NOT_FOUND if missing) via
 *   `devices.getById`. `import { canTransition } from '../domain/deviceLifecycle.js'`.
 *   If `!canTransition(device.status, to)` throw `new AppError('INVALID_TRANSITION')`.
 *   If `to === 'wiped'`: require payload.wipeMethod && payload.wipeDate &&
 *   payload.wipeOperator, else throw `new AppError('WIPE_FIELDS_REQUIRED')`.
 *   If `to === 'available'`: require device.wipeMethod && device.wipeDate
 *   && device.wipeOperator (the CURRENT device row's fields, set by an
 *   earlier 'wiped' transition), else throw `new AppError('WIPE_REQUIRED')`.
 *   Call `devices.updateStatus(deviceId, to, to === 'wiped' ? payload as WipeInput : undefined)`,
 *   then `devices.appendEvent(deviceId, to, actor)`, return the updated device.
 * - getTimeline: load device (NOT_FOUND if missing), `devices.listEvents(deviceId)`,
 *   return `{device, events}`.
 * - searchBySerial: `devices.findBySerial(serial)`.
 * - getById / getByAssetTag: pass straight through to the store.
 * - setReplacesLink: pass straight through to `devices.setReplacesLink`.
 *   Not a status change, so it is fine for this to be a thin passthrough.
 */
export class DeviceService implements DeviceLifecyclePort {
  constructor(
    private devices: DeviceStore,
    private clock: Clock,
  ) {}

  getById(_deviceId: number): Device | null {
    throw new Error('not implemented: DeviceService.getById');
  }

  getByAssetTag(_assetTag: string): Device | null {
    throw new Error('not implemented: DeviceService.getByAssetTag');
  }

  transitionDevice(
    _deviceId: number,
    _to: DeviceStatus,
    _actor: string,
    _payload?: Partial<WipeInput>,
  ): Device {
    throw new Error('not implemented: DeviceService.transitionDevice');
  }

  getTimeline(_deviceId: number): { device: Device; events: DeviceEvent[] } {
    throw new Error('not implemented: DeviceService.getTimeline');
  }

  searchBySerial(_serial: string): Device | null {
    throw new Error('not implemented: DeviceService.searchBySerial');
  }

  setReplacesLink(_deviceId: number, _replacesDeviceId: number): void {
    throw new Error('not implemented: DeviceService.setReplacesLink');
  }
}
