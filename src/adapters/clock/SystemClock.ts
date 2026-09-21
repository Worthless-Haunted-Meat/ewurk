import type { Clock } from '../../ports/clock.js';

/** STUB — implemented by T1. Every method throws until then. */
export class SystemClock implements Clock {
  now(): Date {
    throw new Error('not implemented: SystemClock.now');
  }

  todayISO(): string {
    throw new Error('not implemented: SystemClock.todayISO');
  }
}
