import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

function main(): void {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`ewurk-lease-economics listening on http://localhost:${port}`);
  });
}

if (process.argv[1]) {
  try {
    const invoked = realpathSync(resolve(process.argv[1]));
    const thisFile = realpathSync(fileURLToPath(import.meta.url));
    if (invoked === thisFile) {
      main();
    }
  } catch {
    main();
  }
}
