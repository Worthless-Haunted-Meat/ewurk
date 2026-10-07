export type ImageManifest = {
  version: string;
  codename: string;
  baseSuite: string;
  architecture: string;
  desktop: string;
  requiredPackages: string[];
  forbiddenPackages: string[];
  firmwarePackages: string[];
  firstBootVersion: string;
};

const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
  );
}

export type ManifestValidationError = {
  field: string;
  message: string;
};

export function validateImageManifest(raw: unknown): {
  manifest?: ImageManifest;
  errors: ManifestValidationError[];
} {
  const errors: ManifestValidationError[] = [];

  if (raw === null || typeof raw !== 'object') {
    return { errors: [{ field: 'manifest', message: 'must be a JSON object' }] };
  }

  const record = raw as Record<string, unknown>;

  const version = record.version;
  if (!isNonEmptyString(version)) {
    errors.push({ field: 'version', message: 'must be a non-empty string' });
  } else if (!SEMVER_RE.test(version)) {
    errors.push({ field: 'version', message: 'must be semver (e.g. 1.0.0)' });
  }

  const codename = record.codename;
  if (!isNonEmptyString(codename)) {
    errors.push({ field: 'codename', message: 'must be a non-empty string' });
  }

  const baseSuite = record.baseSuite;
  if (!isNonEmptyString(baseSuite)) {
    errors.push({ field: 'baseSuite', message: 'must be a non-empty string' });
  }

  const architecture = record.architecture;
  if (!isNonEmptyString(architecture)) {
    errors.push({ field: 'architecture', message: 'must be a non-empty string' });
  } else if (architecture !== 'amd64') {
    errors.push({ field: 'architecture', message: 'v1 supports amd64 only' });
  }

  const desktop = record.desktop;
  if (!isNonEmptyString(desktop)) {
    errors.push({ field: 'desktop', message: 'must be a non-empty string' });
  } else if (desktop !== 'xfce') {
    errors.push({ field: 'desktop', message: 'v1 supports xfce only' });
  }

  const requiredPackages = record.requiredPackages;
  if (!isStringArray(requiredPackages)) {
    errors.push({ field: 'requiredPackages', message: 'must be a non-empty string array' });
  }

  const forbiddenPackages = record.forbiddenPackages;
  if (!isStringArray(forbiddenPackages)) {
    errors.push({ field: 'forbiddenPackages', message: 'must be a non-empty string array' });
  }

  const firmwarePackages = record.firmwarePackages;
  if (!isStringArray(firmwarePackages)) {
    errors.push({ field: 'firmwarePackages', message: 'must be a non-empty string array' });
  }

  const firstBootVersion = record.firstBootVersion;
  if (!isNonEmptyString(firstBootVersion)) {
    errors.push({ field: 'firstBootVersion', message: 'must be a non-empty string' });
  } else if (!SEMVER_RE.test(firstBootVersion)) {
    errors.push({ field: 'firstBootVersion', message: 'must be semver (e.g. 0.1.0)' });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    manifest: {
      version: version as string,
      codename: codename as string,
      baseSuite: baseSuite as string,
      architecture: architecture as string,
      desktop: desktop as string,
      requiredPackages: requiredPackages as string[],
      forbiddenPackages: forbiddenPackages as string[],
      firmwarePackages: firmwarePackages as string[],
      firstBootVersion: firstBootVersion as string,
    },
    errors: [],
  };
}
