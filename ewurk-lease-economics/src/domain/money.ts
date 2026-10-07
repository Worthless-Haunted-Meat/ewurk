/** Round-half-up integer division: ⌊(numerator + denominator/2) / denominator⌋. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new Error('divRoundHalfUp requires integer numerator and denominator');
  }
  if (denominator <= 0) {
    throw new Error('divRoundHalfUp requires positive denominator');
  }
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

/** Smallest whole months at `centsPerMonth` to cover `totalCents` (all integers). */
export function monthsToCoverCents(totalCents: number, centsPerMonth: number): number {
  if (!Number.isInteger(totalCents) || !Number.isInteger(centsPerMonth)) {
    throw new Error('monthsToCoverCents requires integer cents');
  }
  if (totalCents < 0 || centsPerMonth <= 0) {
    throw new Error('monthsToCoverCents requires non-negative total and positive monthly rate');
  }
  if (totalCents === 0) {
    return 0;
  }
  return Math.floor((totalCents + centsPerMonth - 1) / centsPerMonth);
}

export function centsToDisplay(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error('centsToDisplay requires integer cents');
  }
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars}.${remainder}`;
}
