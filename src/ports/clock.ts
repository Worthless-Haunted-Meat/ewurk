export interface Clock {
  now(): Date;
  /** 'YYYY-MM-DD' for the current date. */
  todayISO(): string;
}
