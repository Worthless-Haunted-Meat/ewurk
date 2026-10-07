import type { ImageManifest } from '../manifest/schema.js';

export type TelemetryPolicy = {
  forbiddenServices: string[];
  forbiddenPaths: string[];
};

export type TelemetryViolation = {
  kind: 'forbidden-package' | 'forbidden-service' | 'forbidden-path';
  name: string;
};

export function parseTelemetryPolicy(raw: unknown): TelemetryPolicy {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('telemetry policy must be a JSON object');
  }
  const record = raw as Record<string, unknown>;
  const forbiddenServices = record.forbiddenServices;
  const forbiddenPaths = record.forbiddenPaths;
  if (!Array.isArray(forbiddenServices) || !forbiddenServices.every((s) => typeof s === 'string')) {
    throw new Error('forbiddenServices must be a string array');
  }
  if (!Array.isArray(forbiddenPaths) || !forbiddenPaths.every((p) => typeof p === 'string')) {
    throw new Error('forbiddenPaths must be a string array');
  }
  return {
    forbiddenServices: forbiddenServices as string[],
    forbiddenPaths: forbiddenPaths as string[],
  };
}

export function checkTelemetryPolicy(
  manifest: ImageManifest,
  policy: TelemetryPolicy,
  installedPackages: string[],
  enabledServices: string[],
  presentPaths: string[],
): TelemetryViolation[] {
  const violations: TelemetryViolation[] = [];
  const packages = new Set(installedPackages);
  const services = new Set(enabledServices);
  const paths = new Set(presentPaths);

  for (const pkg of manifest.forbiddenPackages) {
    if (packages.has(pkg)) {
      violations.push({ kind: 'forbidden-package', name: pkg });
    }
  }

  for (const service of policy.forbiddenServices) {
    if (services.has(service)) {
      violations.push({ kind: 'forbidden-service', name: service });
    }
  }

  for (const filePath of policy.forbiddenPaths) {
    if (paths.has(filePath)) {
      violations.push({ kind: 'forbidden-path', name: filePath });
    }
  }

  return violations;
}

export function formatTelemetryViolations(violations: TelemetryViolation[]): string {
  return violations
    .map((v) => `${v.kind}:${v.name}`)
    .sort()
    .join(', ');
}
