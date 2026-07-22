import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leadsNaarCsv, parsePortefeuille } from './csv.js';
import { demoPortefeuille } from './demo.js';
import { scanPortefeuille } from './scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '25mb' }));

  // Scans blijven in het geheugen; Leaklight bewaart geen portefeuilles.
  const scans = new Map();

  const bewaarScan = (resultaat, bron) => {
    const scanId = randomUUID();
    const scan = { scanId, bron, aangemaakt: new Date().toISOString(), ...resultaat };
    scans.set(scanId, scan);
    return scan;
  };

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/scan', (req, res) => {
    const csvTekst = typeof req.body === 'string' ? req.body : req.body?.csv;
    if (typeof csvTekst !== 'string' || !csvTekst.trim()) {
      return res.status(400).json({ error: 'Stuur de portefeuille als CSV mee (body of veld "csv").' });
    }
    try {
      const klanten = parsePortefeuille(csvTekst);
      res.status(201).json(bewaarScan(scanPortefeuille(klanten), 'upload'));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/scan/demo', (req, res) => {
    res.status(201).json(bewaarScan(scanPortefeuille(demoPortefeuille()), 'demo'));
  });

  app.get('/api/scans/:id/leads.csv', (req, res) => {
    const scan = scans.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan niet gevonden.' });
    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="leaklight-leads.csv"')
      .send(leadsNaarCsv(scan.leads));
  });

  // In productie serveert de server ook de gebouwde frontend.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  return app;
}
