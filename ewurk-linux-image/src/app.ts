import express from 'express';

export function createApp(): express.Express {
  const app = express();

  app.get('/', (_req, res) => {
    res.status(200).json({
      ok: true,
      project: 'ewurk-linux-image',
      docs: ['SPEC.md', 'ROADMAP.md', 'ewurk-linux-image/README.md'],
    });
  });

  return app;
}
