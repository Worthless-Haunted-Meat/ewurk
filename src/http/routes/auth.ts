import { Router } from 'express';
import type { AppDeps } from '../../deps.js';
import { asyncHandler } from '../asyncHandler.js';
import { getSessionId, SESSION_COOKIE_NAME } from '../middleware/session.js';

export function authWebRouter(deps: AppDeps): Router {
  const router = Router();

  router.post(
    '/magic-link',
    asyncHandler(async (req, res) => {
      const email = typeof req.body?.email === 'string' ? req.body.email : '';
      deps.authService.requestMagicLink(email);
      res.redirect('/login?sent=1');
    }),
  );

  router.get(
    '/verify',
    asyncHandler(async (req, res) => {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const { sessionId } = deps.authService.verifyMagicLink(token);
      res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, path: '/', sameSite: 'lax' });
      res.redirect('/');
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      const sessionId = getSessionId(req);
      if (sessionId) deps.authService.logout(sessionId);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.redirect('/login');
    }),
  );

  return router;
}
