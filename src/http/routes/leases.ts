import { Router } from 'express';
import type { AppDeps } from '../../deps.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireRole, requireRoleApi } from '../middleware/requireRole.js';
import { actorName } from '../actor.js';
import { AppError } from '../errors.js';
import { dollarsToCents } from '../../domain/money.js';

function leaseSummary(deps: AppDeps, leaseId: number) {
  const lease = deps.leases.getById(leaseId);
  if (!lease) throw new AppError('NOT_FOUND');
  const family = deps.families.getById(lease.familyId);
  const currentDevice = deps.leaseService.getCurrentDevice(leaseId);
  const status = deps.paymentService.getStatus(leaseId);
  return { lease, family, currentDevice, status };
}

export function leasesWebRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRole('staff'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const leases = deps.leases.listAll().map((lease) => leaseSummary(deps, lease.id));
      res.render('leases/list', { user: req.user, leases });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const familyId = Number(req.body?.familyId);
      const assetTag = String(req.body?.assetTag ?? '').trim();
      deps.leaseService.createLease(familyId, assetTag, actorName(req));
      res.redirect(`/families/${familyId}`);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const { lease, family, currentDevice, status } = leaseSummary(deps, id);
      const custody = deps.leaseService.getCustodyChain(id);
      const payments = deps.payments.listByLease(id);
      const availableDevices = deps.devices.listAll().filter((d) => d.status === 'available');
      res.render('leases/detail', {
        user: req.user,
        lease,
        family,
        currentDevice,
        status,
        custody,
        payments,
        availableDevices,
      });
    }),
  );

  router.post(
    '/:id/swap',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const newAssetTag = String(req.body?.newAssetTag ?? '').trim();
      deps.leaseService.swap(id, newAssetTag, actorName(req));
      res.redirect(`/leases/${id}`);
    }),
  );

  router.post(
    '/:id/payments',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const amountDollars = Number(req.body?.amountDollars ?? 0);
      const paidDate = String(req.body?.paidDate ?? '').trim();
      deps.paymentService.recordPayment(id, dollarsToCents(amountDollars), paidDate);
      res.redirect(`/leases/${id}`);
    }),
  );

  router.post(
    '/:id/hardship-pause',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const paused = req.body?.paused === 'true' || req.body?.paused === true || req.body?.paused === 'on';
      deps.paymentService.setHardshipPause(id, paused);
      res.redirect(`/leases/${id}`);
    }),
  );

  return router;
}

export function leasesApiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRoleApi('staff'));

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(deps.leases.listAll());
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const familyId = Number(req.body?.familyId);
      const assetTag = String(req.body?.assetTag ?? '');
      const lease = deps.leaseService.createLease(familyId, assetTag, actorName(req));
      res.status(201).json(lease);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const lease = deps.leases.getById(Number(req.params.id));
      if (!lease) throw new AppError('NOT_FOUND');
      res.json(lease);
    }),
  );

  router.post(
    '/:id/swap',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const newAssetTag = String(req.body?.newAssetTag ?? '');
      const lease = deps.leaseService.swap(id, newAssetTag, actorName(req));
      res.json(lease);
    }),
  );

  router.post(
    '/:id/payments',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const amountCents = Number(req.body?.amountCents ?? 0);
      const paidDate = String(req.body?.paidDate ?? '');
      const payment = deps.paymentService.recordPayment(id, amountCents, paidDate);
      res.status(201).json(payment);
    }),
  );

  router.post(
    '/:id/hardship-pause',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const paused = Boolean(req.body?.paused);
      const lease = deps.paymentService.setHardshipPause(id, paused);
      res.json(lease);
    }),
  );

  return router;
}
