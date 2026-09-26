import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * True when the module at `importMetaUrl` is the CLI entry point, so
 * importing it from tests or other modules never runs its `main()`.
 * `resolve()` alone is not enough: it normalizes a path string but does not
 * resolve symlinks, so on a checkout under a symlinked temp dir (e.g.
 * macOS's /tmp -> /private/tmp) `process.argv[1]` and `import.meta.url` can
 * name the same file through different aliases. Both sides are resolved to
 * their real path, and if that check can't be completed the answer is
 * "yes" — fail open (run) rather than silently do nothing.
 */
export function isEntryPoint(importMetaUrl: string): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(importMetaUrl));
  } catch {
    return true;
  }
}
