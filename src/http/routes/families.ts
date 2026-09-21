import { Router } from 'express';
import type { AppDeps } from '../../deps.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireRole, requireRoleApi } from '../middleware/requireRole.js';

export function familiesWebRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRole('staff'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      // The search box and the "add family" name field are the same
      // input (see views/families/list.ejs) — a common "type to find, or
      // add if new" pattern — so the search term arrives as `name`, not
      // `q`, when submitted via the "Search" button's formmethod="get".
      const q = typeof req.query.name === 'string' ? req.query.name : '';
      const families = q ? deps.familyService.search(q) : deps.families.list();
      res.render('families/list', { user: req.user, families, q });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      // Only these three fields are ever read off the request body (R22).
      const name = String(req.body?.name ?? '').trim();
      const contact = String(req.body?.contact ?? '').trim();
      const neighborhoodRaw = req.body?.neighborhood;
      const neighborhood = neighborhoodRaw ? String(neighborhoodRaw).trim() : undefined;
      const family = deps.familyService.createFamily({ name, contact, neighborhood });
      res.redirect(`/families/${family.id}`);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const summary = deps.familyService.getSummary(id);
      const availableDevices = deps.devices.listAll().filter((d) => d.status === 'available');
      res.render('families/detail', { user: req.user, summary, availableDevices });
    }),
  );

  return router;
}

export function familiesApiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRoleApi('staff'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      res.json(q ? deps.familyService.search(q) : deps.families.list());
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      // Only these three fields are ever read off the request body (R22).
      const name = String(req.body?.name ?? '');
      const contact = String(req.body?.contact ?? '');
      const neighborhoodRaw = req.body?.neighborhood;
      const neighborhood = neighborhoodRaw ? String(neighborhoodRaw) : undefined;
      const family = deps.familyService.createFamily({ name, contact, neighborhood });
      res.status(201).json(family);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const summary = deps.familyService.getSummary(Number(req.params.id));
      res.json(summary);
    }),
  );

  return router;
}
