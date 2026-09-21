import { Router } from 'express';
import type { AppDeps } from '../../deps.js';

/**
 * Static endpoint index for GET /api. Deliberately hand-written and fixed
 * (not derived from route introspection) so it can never accidentally
 * grow an action like "lock"/"disable"/"brick" (R15) — there is no such
 * action anywhere in this system, by design, for non-payment.
 */
const ENDPOINTS = [
  'GET /api/donations',
  'POST /api/donations',
  'GET /api/donations/:id',
  'POST /api/donations/:id/items',
  'GET /api/donations/:id/acknowledgment',
  'GET /api/devices',
  'GET /api/devices/:assetTag',
  'POST /api/devices/:assetTag/transition',
  'GET /api/leases',
  'POST /api/leases',
  'GET /api/leases/:id',
  'POST /api/leases/:id/swap',
  'POST /api/leases/:id/payments',
  'POST /api/leases/:id/hardship-pause',
  'GET /api/families',
  'POST /api/families',
  'GET /api/families/:id',
  'GET /api/classes',
  'POST /api/classes',
  'GET /api/classes/:id',
  'POST /api/classes/:id/roster',
  'POST /api/classes/:id/attendance',
];

export function apiIndexRouter(_deps: AppDeps): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json({ name: 'EWURK API', version: '1', endpoints: ENDPOINTS });
  });
  return router;
}
