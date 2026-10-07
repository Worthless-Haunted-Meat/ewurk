import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateFromCsvText } from './cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type IndexViewModel = {
  title: string;
  csv_text?: string;
  results?: string;
  error?: string;
};

function renderIndex(res: Response, model: IndexViewModel, status = 200): void {
  res.status(status).render('index', model);
}

function handleCalculate(req: Request, res: Response): void {
  const csvText = String(req.body?.csv_text ?? '');
  if (csvText.trim() === '') {
    renderIndex(res, {
      title: 'EWURK lease economics',
      error: 'Paste CSV text or choose a file to upload.',
      csv_text: csvText,
    }, 400);
    return;
  }

  try {
    const results = calculateFromCsvText(csvText);
    renderIndex(res, {
      title: 'EWURK lease economics',
      csv_text: csvText,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    renderIndex(res, {
      title: 'EWURK lease economics',
      error: message,
      csv_text: csvText,
    }, 422);
  }
}

export function createApp(): Express {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.urlencoded({ extended: true, limit: '512kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/', (_req, res) => {
    renderIndex(res, { title: 'EWURK lease economics' });
  });

  app.post('/calculate', handleCalculate);

  return app;
}
