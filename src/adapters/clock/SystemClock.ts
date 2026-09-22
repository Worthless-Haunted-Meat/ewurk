import type { Clock } from '../../ports/clock.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  todayISO(): string {
    return this.now().toISOString().slice(0, 10);
  }
}
