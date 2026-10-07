import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { packageRoot } from '../paths.js';

export type LivebuildLayoutCheck = {
  id: string;
  path: string;
  ok: boolean;
  detail?: string;
};

function checkPath(relativePath: string, id: string): LivebuildLayoutCheck {
  const fullPath = path.join(packageRoot(), relativePath);
  const ok = existsSync(fullPath);
  return { id, path: relativePath, ok };
}

export function requiredLivebuildPaths(): string[] {
  return [
    'image/config/auto/config',
    'image/config/package-lists/ewurk-desktop.list.chroot',
    'image/config/hooks/normal/0100-ewurk-overlay.chroot',
    'image/config/hooks/chroot_local-hooks/0100-enable-ewurk-firstboot',
    'image/overlay/etc/systemd/system/ewurk-firstboot.service',
    'image/overlay/usr/lib/ewurk/firstboot.sh',
    'image/overlay/usr/share/doc/ewurk-firstboot/README',
    'scripts/host-deps.sh',
  ];
}

export function verifyLivebuildLayout(): LivebuildLayoutCheck[] {
  return requiredLivebuildPaths().map((relativePath) =>
    checkPath(relativePath, relativePath),
  );
}

export async function hookEnablesFirstbootService(): Promise<LivebuildLayoutCheck> {
  const hookPath = path.join(
    packageRoot(),
    'image/config/hooks/chroot_local-hooks/0100-enable-ewurk-firstboot',
  );
  const text = await readFile(hookPath, 'utf8');
  const ok =
    text.includes('ewurk-firstboot.service') &&
    (text.includes('ln -sf') || text.includes('systemctl enable'));
  return {
    id: 'chroot_local-hooks-enable-firstboot',
    path: 'image/config/hooks/chroot_local-hooks/0100-enable-ewurk-firstboot',
    ok,
    detail: ok ? undefined : 'hook must enable ewurk-firstboot.service',
  };
}
