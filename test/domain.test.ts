import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, nextStatuses, NEXT_STATUSES } from '../src/domain/deviceLifecycle.js';
import { dollarsToCents, centsToDisplay, monthsCovered, addMonthsISO, MONTHLY_CENTS } from '../src/domain/money.js';

describe('domain/deviceLifecycle (pure, supports R5/R6)', () => {
  test('[R5] triaged cannot jump straight to leased', () => {
    assert.equal(canTransition('triaged', 'leased'), false);
  });

  test('[R5] received can only move to triaged', () => {
    assert.deepEqual(nextStatuses('received'), ['triaged']);
  });

  test('[R5] the full happy path is unskippable through wiped', () => {
    assert.equal(canTransition('triaged', 'wiped'), true);
    assert.equal(canTransition('triaged', 'refurbished'), false);
    assert.equal(canTransition('wiped', 'refurbished'), true);
    assert.equal(canTransition('refurbished', 'imaged'), true);
    assert.equal(canTransition('imaged', 'available'), true);
  });

  test('[R5] retired has no outgoing transitions', () => {
    assert.deepEqual(NEXT_STATUSES.retired, []);
  });
});

describe('domain/money (pure, supports R12/R13)', () => {
  test('[R12] dollarsToCents converts $20 to 2000 cents', () => {
    assert.equal(dollarsToCents(20), 2000);
  });

  test('[R12] centsToDisplay formats 2000 as $20.00', () => {
    assert.equal(centsToDisplay(2000), '$20.00');
  });

  test('[R13] monthsCovered floors partial months', () => {
    assert.equal(monthsCovered(0), 0);
    assert.equal(monthsCovered(1999), 0);
    assert.equal(monthsCovered(MONTHLY_CENTS), 1);
    assert.equal(monthsCovered(3 * MONTHLY_CENTS + 500), 3);
  });

  test('[R13] addMonthsISO advances the calendar month', () => {
    assert.equal(addMonthsISO('2026-01-15', 1), '2026-02-15');
    assert.equal(addMonthsISO('2026-01-15', 0), '2026-01-15');
  });
});
