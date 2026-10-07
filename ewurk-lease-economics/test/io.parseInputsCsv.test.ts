import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CSV_HEADER_COLUMNS, parseInputsCsv } from '../src/io/parseInputsCsv.js';
import { DEFAULT_MONTHLY_LEASE_CENTS } from '../src/domain/constants.js';

const header = CSV_HEADER_COLUMNS.join(',');

function row(cells: string[]): string {
  return `${header}\n${cells.join(',')}`;
}

describe('parseInputsCsv', () => {
  test('parses labeled example row from shipped template', () => {
    const path = fileURLToPath(new URL('../templates/inputs.template.csv', import.meta.url));
    const text = readFileSync(path, 'utf8');
    const rows = parseInputsCsv(text);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.label, 'example');
    assert.equal(rows[0]?.parts_cents, 11111);
    assert.equal(rows[0]?.monthly_lease_cents, DEFAULT_MONTHLY_LEASE_CENTS);
  });

  test('rejects missing required column in header', () => {
    const bad = 'label,parts_cents,labor_minutes\nshop,,';
    assert.throws(() => parseInputsCsv(bad), /missing required column/);
  });

  test('rejects negative cents', () => {
    const csv = row(['shop', '-5', '60', '1000', '5', '4', '0']);
    assert.throws(() => parseInputsCsv(csv), /parts_cents must be a non-negative integer/);
  });

  test('rejects decimal dollar strings', () => {
    const csv = row(['shop', '40.00', '60', '1000', '5', '4', '0']);
    assert.throws(() => parseInputsCsv(csv), /not dollars or decimals/);
  });

  test('rejects units_reach_available greater than units_donated', () => {
    const csv = row(['shop', '1000', '60', '1000', '3', '4', '0']);
    assert.throws(() => parseInputsCsv(csv), /units_reach_available cannot exceed units_donated/);
  });
});
