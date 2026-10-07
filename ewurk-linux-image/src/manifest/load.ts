import { readFile } from 'node:fs/promises';

import { manifestPath } from '../paths.js';
import { type ImageManifest, validateImageManifest } from './schema.js';

export async function loadImageManifest(filePath = manifestPath()): Promise<ImageManifest> {
  const text = await readFile(filePath, 'utf8');
  const parsed: unknown = JSON.parse(text);
  const { manifest, errors } = validateImageManifest(parsed);
  if (!manifest) {
    const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid image manifest at ${filePath}: ${detail}`);
  }
  return manifest;
}

export function loadImageManifestFromJson(text: string): ImageManifest {
  const parsed: unknown = JSON.parse(text);
  const { manifest, errors } = validateImageManifest(parsed);
  if (!manifest) {
    const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid image manifest JSON: ${detail}`);
  }
  return manifest;
}
