import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppDeps } from './deps.js';
import { errorEnvelope } from './http/errors.js';
import { sessionMiddleware } from './http/middleware/session.js';
import { authWebRouter } from './http/routes/auth.js';
import { donationsWebRouter, donationsApiRouter } from './http/routes/donations.js';
import { devicesWebRouter, devicesApiRouter } from './http/routes/devices.js';
import { leasesWebRouter, leasesApiRouter } from './http/routes/leases.js';
import { familiesWebRouter, familiesApiRouter } from './http/routes/families.js';
import { classesWebRouter, classesApiRouter } from './http/routes/classes.js';
import { apiIndexRouter } from './http/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware(deps));

  app.get('/', (req, res) => {
    res.render(req.user ? 'dashboard' : 'login', { user: req.user ?? null, sent: false });
  });
  app.get('/login', (req, res) => {
    res.render('login', { user: req.user ?? null, sent: req.query.sent === '1' });
  });

  app.use('/auth', authWebRouter(deps));

  if (deps.devOutboxEnabled) {
    app.get('/dev/outbox', (_req, res) => {
      res.json(deps.mailer.list());
    });
  } else {
    app.get('/dev/outbox', (_req, res) => {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
    });
  }

  app.use('/donations', donationsWebRouter(deps));
  app.use('/devices', devicesWebRouter(deps));
  app.use('/leases', leasesWebRouter(deps));
  app.use('/families', familiesWebRouter(deps));
  app.use('/classes', classesWebRouter(deps));

  app.use('/api', apiIndexRouter(deps));
  app.use('/api/donations', donationsApiRouter(deps));
  app.use('/api/devices', devicesApiRouter(deps));
  app.use('/api/leases', leasesApiRouter(deps));
  app.use('/api/families', familiesApiRouter(deps));
  app.use('/api/classes', classesApiRouter(deps));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such API endpoint.' } });
  });

  app.use((req, res) => {
    res.status(404).render('errors/generic', { status: 404, message: 'Not found.', user: req.user ?? null });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = errorEnvelope(err);
    if (req.originalUrl.startsWith('/api/')) {
      res.status(status).json(body);
      return;
    }
    res.status(status).render('errors/generic', { status, message: body.error.message, user: req.user ?? null });
  });

  return app;
}
