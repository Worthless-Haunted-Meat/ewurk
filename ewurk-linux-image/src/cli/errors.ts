// SPDX-License-Identifier: GPL-3.0-or-later

export function cliError(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

export function formatCommandFailure(command: string, detail: string): string {
  if (detail.includes('ENOENT')) {
    return [
      `Command not found: ${command}`,
      'Install host packages: sudo ./scripts/host-deps.sh --install',
    ].join('\n');
  }
  return `${command} failed: ${detail}`;
}
