export const MONTHLY_CENTS = 2000; // $20.00/month, fixed for v1

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDisplay(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars}.${remainder}`;
}

/** Whole months of $20 covered by a total of paid cents. */
export function monthsCovered(totalCents: number): number {
  return Math.floor(totalCents / MONTHLY_CENTS);
}

/** Adds `months` calendar months to an ISO 'YYYY-MM-DD' date string. */
export function addMonthsISO(dateISO: string, months: number): string {
  const parts = dateISO.slice(0, 10).split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
