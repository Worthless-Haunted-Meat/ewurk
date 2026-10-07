import { readFile } from 'node:fs/promises';

import { loadImageManifest } from '../manifest/load.js';
import { desktopPackageListPath, manifestPath } from '../paths.js';
import {
  checkPackagePolicy,
  formatPackageViolations,
  parsePackageList,
} from '../verify/packages.js';

async function main(): Promise<void> {
  const manifest = await loadImageManifest(manifestPath());
  const listText = await readFile(desktopPackageListPath(), 'utf8');
  const packages = parsePackageList(listText);
  const violations = checkPackagePolicy(manifest, packages);

  if (violations.length > 0) {
    process.stderr.write(
      `Package policy failed for ${desktopPackageListPath()}: ${formatPackageViolations(violations)}\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    `Validated ${manifestPath()} (${manifest.version}) against ${packages.length} packages.\n`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
