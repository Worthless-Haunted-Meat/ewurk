// SPDX-License-Identifier: GPL-3.0-or-later

import { spawnSync } from 'node:child_process';

const HOST_BINARIES = ['lb', 'debootstrap', 'xorriso'] as const;

function commandExists(name: string): boolean {
  const result = spawnSync('sh', ['-c', `command -v ${name}`], { encoding: 'utf8' });
  return result.status === 0;
}

export function missingHostBinaries(): string[] {
  return HOST_BINARIES.filter((name) => !commandExists(name));
}

export function formatMissingHostDepsMessage(missing: string[]): string {
  return [
    'Missing host tools required for live-build:',
    ...missing.map((b) => `  - ${b}`),
    'Install documented packages: sudo ./scripts/host-deps.sh --install',
    'Or list packages: ./scripts/host-deps.sh',
  ].join('\n');
}
