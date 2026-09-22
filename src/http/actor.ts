import type { Request } from 'express';

/** The string recorded as `actor` on device events / lease actions. */
export function actorName(req: Request): string {
  return req.user?.name ?? req.user?.email ?? 'unknown';
}
