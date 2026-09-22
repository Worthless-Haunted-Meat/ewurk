import { Router } from 'express';
import type { AppDeps } from '../../deps.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireRole, requireRoleApi } from '../middleware/requireRole.js';
import { actorName } from '../actor.js';
import { AppError } from '../errors.js';

export function donationsWebRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRole('staff', 'volunteer'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const donations = deps.donations.list();
      res.render('donations/list', { user: req.user, donations });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const donorOrg = String(req.body?.donorOrg ?? '').trim();
      const pickupDate = String(req.body?.pickupDate ?? '').trim();
      const donation = deps.donationService.createDonation({ donorOrg, pickupDate });
      res.redirect(`/donations/${donation.id}`);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const donation = deps.donations.getById(id);
      if (!donation) throw new AppError('NOT_FOUND');
      const items = deps.devices.listByDonation(id);
      res.render('donations/detail', { user: req.user, donation, items });
    }),
  );

  router.post(
    '/:id/items',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const model = String(req.body?.model ?? '').trim();
      const serial = String(req.body?.serial ?? '').trim();
      deps.donationService.receiveItem(id, { model, serial }, actorName(req));
      res.redirect(`/donations/${id}`);
    }),
  );

  router.get(
    '/:id/acknowledgment',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const letter = deps.donationService.generateAcknowledgment(id);
      res.render('donations/acknowledgment', { user: req.user, letter });
    }),
  );

  return router;
}

export function donationsApiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRoleApi('staff', 'volunteer'));

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(deps.donations.list());
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const donorOrg = String(req.body?.donorOrg ?? '');
      const pickupDate = String(req.body?.pickupDate ?? '');
      const donation = deps.donationService.createDonation({ donorOrg, pickupDate });
      res.status(201).json(donation);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const donation = deps.donations.getById(Number(req.params.id));
      if (!donation) throw new AppError('NOT_FOUND');
      res.json(donation);
    }),
  );

  router.post(
    '/:id/items',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const model = String(req.body?.model ?? '');
      const serial = String(req.body?.serial ?? '');
      const device = deps.donationService.receiveItem(id, { model, serial }, actorName(req));
      res.status(201).json(device);
    }),
  );

  router.get(
    '/:id/acknowledgment',
    asyncHandler(async (req, res) => {
      const letter = deps.donationService.generateAcknowledgment(Number(req.params.id));
      res.json(letter);
    }),
  );

  return router;
}
