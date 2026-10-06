import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dollarsToCents,
  centsToDisplay,
  monthsCovered,
  addMonthsISO,
} from '../src/domain/money.js';

describe('domain/money', () => {
  describe('dollarsToCents', () => {
    test('rounds fractional dollars to integer cents', () => {
      assert.equal(dollarsToCents(19.999), 2000);
      assert.equal(dollarsToCents(0.005), 1);
      assert.equal(dollarsToCents(0), 0);
    });
  });

  describe('centsToDisplay', () => {
    test('formats zero, negative amounts, and single-digit cents', () => {
      assert.equal(centsToDisplay(0), '$0.00');
      assert.equal(centsToDisplay(-105), '-$1.05');
      assert.equal(centsToDisplay(5), '$0.05');
    });
  });

  describe('monthsCovered', () => {
    test('floors at the $20/month boundary', () => {
      assert.equal(monthsCovered(1999), 0);
      assert.equal(monthsCovered(2000), 1);
      assert.equal(monthsCovered(2001), 1);
    });
  });

  describe('addMonthsISO', () => {
    test('rolls over month ends and year boundaries', () => {
      assert.equal(addMonthsISO('2026-01-31', 1), '2026-03-03');
      assert.equal(addMonthsISO('2026-12-15', 1), '2027-01-15');
    });
  });
});
