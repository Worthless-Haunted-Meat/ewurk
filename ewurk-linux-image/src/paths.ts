import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root of the `ewurk-linux-image` workspace (parent of `dist/`). */
export function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function manifestPath(): string {
  return path.join(packageRoot(), 'image', 'manifest.json');
}

export function desktopPackageListPath(): string {
  return path.join(packageRoot(), 'image', 'lists', 'desktop.list');
}

export function imageLiveBuildDir(): string {
  return path.join(packageRoot(), 'image');
}

export function distDir(): string {
  return path.join(packageRoot(), 'dist');
}
