// SPDX-License-Identifier: GPL-3.0-or-later

import express from 'express';

export function createApp(): express.Express {
  const app = express();

  app.get('/', (_req, res) => {
    res.status(200).json({
      ok: true,
      project: 'ewurk-linux-image',
      docs: ['SPEC.md', 'ROADMAP.md', 'ewurk-linux-image/README.md'],
      readmeSections: {
        volunteerQuickStart: 'ewurk-linux-image/README.md#volunteer-quick-start',
        build: 'ewurk-linux-image/README.md#build',
        writeUsb: 'ewurk-linux-image/README.md#write-a-bootable-usb',
      },
    });
  });

  return app;
}
