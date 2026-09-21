import type { RequestHandler } from 'express';
import type { AppDeps } from '../../deps.js';

const COOKIE_NAME = 'ewurk_session';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

/** Reads the raw session id straight off the request cookie header. */
export function getSessionId(req: { headers: { cookie?: string } }): string | undefined {
  return parseCookies(req.headers.cookie)[COOKIE_NAME];
}

/**
 * Attaches req.user (or null) from the ewurk_session cookie. Never blocks
 * the request itself — requireRole() is what enforces access.
 */
export function sessionMiddleware(deps: AppDeps): RequestHandler {
  return (req, _res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[COOKIE_NAME];
    if (!sessionId) {
      req.user = null;
      next();
      return;
    }
    const user = deps.authService.getSessionUser(sessionId);
    req.user = user;
    next();
  };
}
