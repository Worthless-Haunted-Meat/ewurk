import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { computeRecovery } from './domain/recovery.js';
import { formatRecoveryReport } from './formatRecoveryReport.js';
import { parseInputsCsv } from './io/parseInputsCsv.js';

export function calculateFromCsvText(csvText: string): string {
  const rows = parseInputsCsv(csvText);
  return rows.map((row) => formatRecoveryReport(row, computeRecovery(row))).join('\n');
}

export function calculateFromCsvFile(filePath: string): string {
  const text = readFileSync(filePath, 'utf8');
  return calculateFromCsvText(text);
}

function printUsage(): void {
  process.stderr.write('Usage: node dist/cli.js <path-to-inputs.csv>\n');
}

function main(): void {
  const fileArg = process.argv[2];
  if (!fileArg) {
    printUsage();
    process.exit(1);
  }
  try {
    const absolute = resolve(fileArg);
    const output = calculateFromCsvFile(absolute);
    process.stdout.write(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}

if (process.argv[1]) {
  try {
    const invoked = realpathSync(resolve(process.argv[1]));
    const thisFile = realpathSync(fileURLToPath(import.meta.url));
    if (invoked === thisFile) {
      main();
    }
  } catch {
    main();
  }
}
