import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Package root (parent of `src/`). */
export const packageRoot = path.join(moduleDir, '..');

export const lessonsDir = path.join(packageRoot, 'lessons');
export const distDir = path.join(packageRoot, 'dist');
