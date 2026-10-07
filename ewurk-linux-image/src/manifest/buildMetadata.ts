export type BuildArtifact = {
  manifestVersion: string;
  builtAt: string;
  isoPath: string;
  sha256: string;
  sizeBytes: number;
};

export type BuildMetadataValidationError = {
  field: string;
  message: string;
};

const ISO_PATH_RE = /^[\w./-]+\.iso$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export function validateBuildArtifact(raw: unknown): {
  artifact?: BuildArtifact;
  errors: BuildMetadataValidationError[];
} {
  const errors: BuildMetadataValidationError[] = [];

  if (raw === null || typeof raw !== 'object') {
    return { errors: [{ field: 'artifact', message: 'must be a JSON object' }] };
  }

  const record = raw as Record<string, unknown>;

  const manifestVersion = record.manifestVersion;
  if (typeof manifestVersion !== 'string' || manifestVersion.trim() === '') {
    errors.push({ field: 'manifestVersion', message: 'must be a non-empty string' });
  }

  const builtAt = record.builtAt;
  if (typeof builtAt !== 'string' || Number.isNaN(Date.parse(builtAt))) {
    errors.push({ field: 'builtAt', message: 'must be an ISO-8601 datetime string' });
  }

  const isoPath = record.isoPath;
  if (typeof isoPath !== 'string' || !ISO_PATH_RE.test(isoPath)) {
    errors.push({ field: 'isoPath', message: 'must be a relative .iso path' });
  }

  const sha256 = record.sha256;
  if (typeof sha256 !== 'string' || !SHA256_RE.test(sha256)) {
    errors.push({ field: 'sha256', message: 'must be a 64-char lowercase hex digest' });
  }

  const sizeBytes = record.sizeBytes;
  if (typeof sizeBytes !== 'number' || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    errors.push({ field: 'sizeBytes', message: 'must be a positive integer' });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    artifact: {
      manifestVersion: manifestVersion as string,
      builtAt: builtAt as string,
      isoPath: isoPath as string,
      sha256: sha256 as string,
      sizeBytes: sizeBytes as number,
    },
    errors: [],
  };
}
