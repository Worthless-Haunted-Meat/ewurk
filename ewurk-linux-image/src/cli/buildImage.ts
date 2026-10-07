import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadImageManifest } from '../manifest/load.js';
import type { BuildArtifact } from '../manifest/buildMetadata.js';
import { packageRoot } from '../paths.js';

function isoFileName(codename: string, version: string): string {
  const safeCodename = codename.replace(/[^a-zA-Z0-9.-]/g, '-');
  return `ewurk-${safeCodename}-${version}.iso`;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited ${code ?? 'unknown'}`));
      }
    });
  });
}

async function findLiveBuildIso(imageDir: string): Promise<string> {
  const entries = await readdir(imageDir);
  const iso = entries.find((name) => name.endsWith('.iso'));
  if (!iso) {
    throw new Error(`No .iso found under ${imageDir} after lb build`);
  }
  return path.join(imageDir, iso);
}

async function buildWithLiveBuild(imageDir: string, distIsoPath: string): Promise<void> {
  const configScript = path.join(imageDir, 'config', 'auto', 'config');
  await runCommand('bash', [configScript], imageDir);
  await runCommand('lb', ['clean'], imageDir);
  await runCommand('lb', ['build'], imageDir);
  const produced = await findLiveBuildIso(imageDir);
  await copyFile(produced, distIsoPath);
}

async function writeStubIso(distIsoPath: string, manifestVersion: string): Promise<void> {
  const payload = [
    'EWURK Linux image build stub (not bootable).',
    'Set EWURK_RUN_LB_BUILD=1 on a live-build host to produce the real ISO.',
    `manifestVersion=${manifestVersion}`,
    `generatedAt=${new Date().toISOString()}`,
    '',
  ].join('\n');
  await writeFile(distIsoPath, payload, 'utf8');
}

async function sha256File(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function writeArtifacts(
  distDir: string,
  isoFile: string,
  manifestVersion: string,
): Promise<BuildArtifact> {
  const isoPath = path.join(distDir, isoFile);
  const sha256 = await sha256File(isoPath);
  const stat = await readFile(isoPath);
  const artifact: BuildArtifact = {
    manifestVersion,
    builtAt: new Date().toISOString(),
    isoPath: isoFile,
    sha256,
    sizeBytes: stat.byteLength,
  };

  await writeFile(
    path.join(distDir, 'SHA256SUMS'),
    `${sha256}  ${isoFile}\n`,
    'utf8',
  );
  await writeFile(
    path.join(distDir, 'build-metadata.json'),
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8',
  );

  return artifact;
}

async function main(): Promise<void> {
  const manifest = await loadImageManifest();
  const distDir = path.join(packageRoot(), 'dist');
  const imageDir = path.join(packageRoot(), 'image');
  await mkdir(distDir, { recursive: true });

  const isoFile = isoFileName(manifest.codename, manifest.version);
  const distIsoPath = path.join(distDir, isoFile);

  if (process.env.EWURK_RUN_LB_BUILD === '1') {
    process.stdout.write('Running live-build (requires root, network, and host packages)…\n');
    await buildWithLiveBuild(imageDir, distIsoPath);
  } else {
    process.stdout.write(
      'Skipping live-build (set EWURK_RUN_LB_BUILD=1 for a bootable ISO). Writing stub artifact…\n',
    );
    await writeStubIso(distIsoPath, manifest.version);
  }

  const artifact = await writeArtifacts(distDir, isoFile, manifest.version);
  process.stdout.write(
    `Wrote ${artifact.isoPath} (${artifact.sizeBytes} bytes) and dist/build-metadata.json\n`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
