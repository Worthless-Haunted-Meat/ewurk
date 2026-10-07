import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { validateBuildArtifact } from '../src/manifest/buildMetadata.js';
import { packageRoot } from '../src/paths.js';

describe('build-metadata.json', () => {
  it('validates the committed fixture', async () => {
    const text = await readFile(
      new URL('./fixtures/build-metadata.json', import.meta.url),
      'utf8',
    );
    const { artifact, errors } = validateBuildArtifact(JSON.parse(text));
    assert.equal(errors.length, 0);
    assert.ok(artifact);
    assert.equal(artifact.manifestVersion, '0.1.0');
  });

  it('validates dist/build-metadata.json when present after npm run build', async () => {
    const metadataPath = `${packageRoot()}/dist/build-metadata.json`;
    let text: string;
    try {
      text = await readFile(metadataPath, 'utf8');
    } catch {
      return;
    }
    const { artifact, errors } = validateBuildArtifact(JSON.parse(text));
    assert.deepEqual(errors, []);
    assert.ok(artifact);

    const sums = (await readFile(`${packageRoot()}/dist/SHA256SUMS`, 'utf8')).trim();
    assert.equal(sums, `${artifact.sha256}  ${artifact.isoPath}`);
    const isoBytes = await readFile(`${packageRoot()}/dist/${artifact.isoPath}`);
    assert.equal(isoBytes.byteLength, artifact.sizeBytes);
  });
});
