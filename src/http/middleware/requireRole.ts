import type { RequestHandler } from 'express';
import type { Role } from '../../domain/types.js';

/**
 * Web-route role gate. Unauthenticated -> redirect /login. Wrong role ->
 * 403 rendering errors/forbidden.ejs. Applied as router-level middleware
 * before any service call, so a blocked request never reaches a stubbed
 * (not-implemented) service.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.redirect('/login');
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).render('errors/forbidden', { user: req.user });
      return;
    }
    next();
  };
}

/**
 * API-route role gate (JSON envelope instead of redirect/HTML). Same
 * ordering guarantee as requireRole: runs before any service call.
 */
export function requireRoleApi(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not authorized to do that.' } });
      return;
    }
    next();
  };
}
