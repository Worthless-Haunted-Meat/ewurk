import { shopInputsWithDefaults } from '../domain/recovery.js';
import type { ShopInputs } from '../domain/types.js';

export const CSV_HEADER_COLUMNS = [
  'label',
  'parts_cents',
  'labor_minutes',
  'labor_cents_per_hour',
  'units_donated',
  'units_reach_available',
  'swap_repair_cents',
] as const;

const EXPECTED_HEADER = CSV_HEADER_COLUMNS.join(',');

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? '';
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      fields.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function parseNonNegativeInt(raw: string, field: string): number {
  const value = raw.trim();
  if (value === '') {
    throw new Error(`${field} is required`);
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`${field} must be a non-negative integer (cents or counts), not dollars or decimals`);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`${field} is out of range`);
  }
  return n;
}

function parsePositiveInt(raw: string, field: string): number {
  const n = parseNonNegativeInt(raw, field);
  if (n <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return n;
}

function rowIsBlank(fields: string[]): boolean {
  return fields.every((f) => f.trim() === '');
}

function parseRow(fields: string[], lineNumber: number): ShopInputs {
  if (fields.length !== CSV_HEADER_COLUMNS.length) {
    throw new Error(`line ${lineNumber}: expected ${CSV_HEADER_COLUMNS.length} columns, got ${fields.length}`);
  }

  const labelRaw = fields[0] ?? '';
  const partsRaw = fields[1] ?? '';
  const laborMinutesRaw = fields[2] ?? '';
  const laborRateRaw = fields[3] ?? '';
  const unitsDonatedRaw = fields[4] ?? '';
  const unitsReachRaw = fields[5] ?? '';
  const swapRaw = fields[6] ?? '';

  const label = labelRaw.trim();
  const parts_cents = parseNonNegativeInt(partsRaw, 'parts_cents');
  const labor_minutes = parseNonNegativeInt(laborMinutesRaw, 'labor_minutes');
  const labor_cents_per_hour = parseNonNegativeInt(laborRateRaw, 'labor_cents_per_hour');
  const units_donated = parsePositiveInt(unitsDonatedRaw, 'units_donated');
  const units_reach_available = parsePositiveInt(unitsReachRaw, 'units_reach_available');
  const swap_repair_cents = parseNonNegativeInt(swapRaw, 'swap_repair_cents');

  if (units_reach_available > units_donated) {
    throw new Error('units_reach_available cannot exceed units_donated');
  }

  return shopInputsWithDefaults({
    label: label === '' ? undefined : label,
    parts_cents,
    labor_minutes,
    labor_cents_per_hour,
    units_donated,
    units_reach_available,
    swap_repair_cents,
  });
}

/**
 * Parse shop input rows from CSV text. Header must match the v1 template exactly.
 * Skips blank lines and blank data rows.
 */
export function parseInputsCsv(text: string): ShopInputs[] {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (normalized === '') {
    throw new Error('CSV is empty');
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 1) {
    throw new Error('CSV is empty');
  }

  const headerLine = lines[0]?.trim() ?? '';
  if (headerLine !== EXPECTED_HEADER) {
    const missing = CSV_HEADER_COLUMNS.filter((col) => !headerLine.split(',').includes(col));
    if (missing.length > 0) {
      throw new Error(`missing required column(s): ${missing.join(', ')}`);
    }
    throw new Error(`unexpected CSV header; expected: ${EXPECTED_HEADER}`);
  }

  const rows: ShopInputs[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const fields = parseCsvLine(lines[i] ?? '');
    if (rowIsBlank(fields)) {
      continue;
    }
    rows.push(parseRow(fields, lineNumber));
  }

  if (rows.length === 0) {
    throw new Error('CSV has no data rows');
  }

  return rows;
}
