import type { ImageManifest } from '../manifest/schema.js';

export type PackagePolicyViolation = {
  kind: 'forbidden' | 'missing-required' | 'missing-firmware';
  packageName: string;
};

/** Parse a Debian package list file (one package per line; `#` comments allowed). */
export function parsePackageList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0);
}

export function checkPackagePolicy(
  manifest: ImageManifest,
  installedPackages: string[],
): PackagePolicyViolation[] {
  const installed = new Set(installedPackages);
  const violations: PackagePolicyViolation[] = [];

  for (const pkg of manifest.forbiddenPackages) {
    if (installed.has(pkg)) {
      violations.push({ kind: 'forbidden', packageName: pkg });
    }
  }

  for (const pkg of manifest.requiredPackages) {
    if (!installed.has(pkg)) {
      violations.push({ kind: 'missing-required', packageName: pkg });
    }
  }

  for (const pkg of manifest.firmwarePackages) {
    if (!installed.has(pkg)) {
      violations.push({ kind: 'missing-firmware', packageName: pkg });
    }
  }

  return violations;
}

export function formatPackageViolations(violations: PackagePolicyViolation[]): string {
  return violations
    .map((v) => `${v.kind}: ${v.packageName}`)
    .sort()
    .join(', ');
}
