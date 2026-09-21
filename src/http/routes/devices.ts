import { Router } from 'express';
import type { AppDeps } from '../../deps.js';
import type { DeviceStatus } from '../../domain/types.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireRole, requireRoleApi } from '../middleware/requireRole.js';
import { actorName } from '../actor.js';
import { AppError } from '../errors.js';
import { nextStatuses } from '../../domain/deviceLifecycle.js';

function viewFlags(device: { status: DeviceStatus; wipeMethod: string | null; wipeDate: string | null; wipeOperator: string | null }) {
  const allowedNext = nextStatuses(device.status);
  const hasWipe = !!device.wipeMethod && !!device.wipeDate && !!device.wipeOperator;
  return {
    allowedNext,
    showWipeForm: allowedNext.includes('wiped'),
    showAvailableAction: allowedNext.includes('available') && hasWipe,
  };
}

/**
 * R8: a device search result must show who donated it and who holds it
 * now. Donor org comes from the device's donation; "holder" is derived by
 * scanning every lease's current custody entry for this device id (there
 * is no reverse device->lease index, so this is a small linear scan —
 * fine at this app's scale) and falls back to "in stock".
 */
function withDonorAndHolder<T extends { id: number; donationId: number }>(deps: AppDeps, device: T) {
  const donorOrg = deps.donations.getById(device.donationId)?.donorOrg ?? 'unknown donor';
  let holder = 'in stock';
  for (const lease of deps.leases.listAll()) {
    if (lease.status !== 'active') continue;
    if (deps.leases.getCurrentDeviceId(lease.id) === device.id) {
      holder = deps.families.getById(lease.familyId)?.name ?? `family ${lease.familyId}`;
      break;
    }
  }
  return { ...device, donorOrg, holder };
}

export function devicesWebRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRole('staff', 'volunteer'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const serial = typeof req.query.serial === 'string' ? req.query.serial : '';
      const rawDevices = serial
        ? [deps.deviceService.searchBySerial(serial)].filter((d): d is NonNullable<typeof d> => d !== null)
        : deps.devices.listAll();
      const devices = rawDevices.map((d) => withDonorAndHolder(deps, d));
      res.render('devices/list', { user: req.user, devices, serial });
    }),
  );

  router.get(
    '/:assetTag',
    asyncHandler(async (req, res) => {
      const found = deps.deviceService.getByAssetTag(req.params.assetTag);
      if (!found) throw new AppError('NOT_FOUND');
      const { device, events } = deps.deviceService.getTimeline(found.id);
      res.render('devices/detail', { user: req.user, device, events, ...viewFlags(device) });
    }),
  );

  router.post(
    '/:assetTag/transition',
    asyncHandler(async (req, res) => {
      const found = deps.deviceService.getByAssetTag(req.params.assetTag);
      if (!found) throw new AppError('NOT_FOUND');
      const to = String(req.body?.to ?? '') as DeviceStatus;
      const payload = {
        wipeMethod: req.body?.wipeMethod ? String(req.body.wipeMethod) : undefined,
        wipeDate: req.body?.wipeDate ? String(req.body.wipeDate) : undefined,
        wipeOperator: req.body?.wipeOperator ? String(req.body.wipeOperator) : undefined,
      };
      deps.deviceService.transitionDevice(found.id, to, actorName(req), payload);
      res.redirect(`/devices/${req.params.assetTag}`);
    }),
  );

  return router;
}

export function devicesApiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRoleApi('staff', 'volunteer'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const serial = typeof req.query.serial === 'string' ? req.query.serial : '';
      const devices = serial
        ? [deps.deviceService.searchBySerial(serial)].filter((d): d is NonNullable<typeof d> => d !== null)
        : deps.devices.listAll();
      res.json(devices);
    }),
  );

  router.get(
    '/:assetTag',
    asyncHandler(async (req, res) => {
      const device = deps.deviceService.getByAssetTag(req.params.assetTag);
      if (!device) throw new AppError('NOT_FOUND');
      res.json(device);
    }),
  );

  router.post(
    '/:assetTag/transition',
    asyncHandler(async (req, res) => {
      const found = deps.deviceService.getByAssetTag(req.params.assetTag);
      if (!found) throw new AppError('NOT_FOUND');
      const to = String(req.body?.to ?? '') as DeviceStatus;
      const payload = {
        wipeMethod: req.body?.wipeMethod as string | undefined,
        wipeDate: req.body?.wipeDate as string | undefined,
        wipeOperator: req.body?.wipeOperator as string | undefined,
      };
      const device = deps.deviceService.transitionDevice(found.id, to, actorName(req), payload);
      res.json(device);
    }),
  );

  return router;
}
