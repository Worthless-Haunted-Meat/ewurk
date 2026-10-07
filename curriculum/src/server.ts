import express from 'express';
import { distDir } from './paths.js';
import { buildSite } from './build.js';

const port = Number(process.env.PORT) || 3000;

buildSite();

const app = express();
app.use(express.static(distDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console -- dev server startup
  console.log(`ewurk-curriculum listening on http://localhost:${port}`);
});
