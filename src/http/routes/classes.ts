import { Router } from 'express';
import type { AppDeps } from '../../deps.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireRole, requireRoleApi } from '../middleware/requireRole.js';
import { AppError } from '../errors.js';

function attendanceWithNames(deps: AppDeps, sessionId: number) {
  return deps.classes.listAttendance(sessionId).map((row) => ({
    ...row,
    family: deps.families.getById(row.familyId),
  }));
}

export function classesWebRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRole('staff', 'instructor'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const sessions = deps.classService.listSessions();
      res.render('classes/list', { user: req.user, sessions });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const sessionDate = String(req.body?.sessionDate ?? '').trim();
      const topic = String(req.body?.topic ?? '').trim();
      const session = deps.classService.createSession(sessionDate, topic);
      res.redirect(`/classes/${session.id}`);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const session = deps.classService.getSession(id);
      if (!session) throw new AppError('NOT_FOUND');
      const attendance = attendanceWithNames(deps, id);
      res.render('classes/detail', { user: req.user, session, attendance });
    }),
  );

  router.post(
    '/:id/roster',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      deps.classService.buildRoster(id);
      res.redirect(`/classes/${id}`);
    }),
  );

  router.post(
    '/:id/attendance',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const familyId = Number(req.body?.familyId);
      const present = req.body?.present === 'true' || req.body?.present === true || req.body?.present === 'on';
      deps.classService.markAttendance(id, familyId, present);
      res.redirect(`/classes/${id}`);
    }),
  );

  return router;
}

export function classesApiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRoleApi('staff', 'instructor'));

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(deps.classService.listSessions());
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const sessionDate = String(req.body?.sessionDate ?? '');
      const topic = String(req.body?.topic ?? '');
      const session = deps.classService.createSession(sessionDate, topic);
      res.status(201).json(session);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const session = deps.classService.getSession(Number(req.params.id));
      if (!session) throw new AppError('NOT_FOUND');
      res.json(session);
    }),
  );

  router.post(
    '/:id/roster',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const roster = deps.classService.buildRoster(id);
      res.json(roster);
    }),
  );

  router.post(
    '/:id/attendance',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const familyId = Number(req.body?.familyId);
      const present = Boolean(req.body?.present);
      const record = deps.classService.markAttendance(id, familyId, present);
      res.json(record);
    }),
  );

  return router;
}
