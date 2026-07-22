import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakBrief } from './brief.js';
import { leadsNaarCsv, parsePortefeuille } from './csv.js';
import { demoPortefeuille } from './demo.js';
import { scanPortefeuille } from './scanner.js';
import { LEAD_STATUSSEN, ScanStore, opvolging } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(opties = {}) {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '25mb' }));

  // Scans en lead-opvolging worden bewaard op schijf; de portefeuille zelf
  // (de ruwe polisdata) wordt nooit opgeslagen — alleen het scanresultaat.
  const store = new ScanStore(opties.dataFile ?? path.resolve(__dirname, '../data/scans.json'));
  await store.load();

  const bewaarScan = async (resultaat, bron) => {
    const scanId = randomUUID();
    const scan = { scanId, bron, aangemaakt: new Date().toISOString(), ...resultaat };
    return store.voegToe(scan);
  };

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/scan', async (req, res) => {
    const csvTekst = typeof req.body === 'string' ? req.body : req.body?.csv;
    if (typeof csvTekst !== 'string' || !csvTekst.trim()) {
      return res.status(400).json({ error: 'Stuur de portefeuille als CSV mee (body of veld "csv").' });
    }
    try {
      const klanten = parsePortefeuille(csvTekst);
      res.status(201).json(await bewaarScan(scanPortefeuille(klanten), 'upload'));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/scan/demo', async (req, res) => {
    res.status(201).json(await bewaarScan(scanPortefeuille(demoPortefeuille()), 'demo'));
  });

  app.get('/api/scans', (req, res) => {
    res.json(store.lijst());
  });

  app.get('/api/scans/:id', (req, res) => {
    const scan = store.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan niet gevonden.' });
    res.json(scan);
  });

  app.patch('/api/scans/:id/leads/:leadId', async (req, res) => {
    const status = req.body?.status;
    if (!LEAD_STATUSSEN.includes(status)) {
      return res.status(400).json({ error: `Ongeldige status; kies uit ${LEAD_STATUSSEN.join(', ')}.` });
    }
    const scan = await store.zetStatus(req.params.id, req.params.leadId, status);
    if (!scan) return res.status(404).json({ error: 'Scan of lead niet gevonden.' });
    res.json(scan);
  });

  app.get('/api/scans/:id/leads.csv', (req, res) => {
    const scan = store.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan niet gevonden.' });
    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="leaklight-leads.csv"')
      .send(leadsNaarCsv(scan.leads));
  });

  app.get('/api/scans/:id/klanten/:klantId/brief', (req, res) => {
    const scan = store.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan niet gevonden.' });
    const klant = scan.klanten.find((k) => k.klantId === req.params.klantId);
    if (!klant) return res.status(404).json({ error: 'Klant niet gevonden in deze scan.' });
    if (klant.leks.length === 0) {
      return res.status(400).json({ error: 'Deze klant heeft geen leks; er is geen brief nodig.' });
    }
    res
      .type('text/plain; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="migratiebrief-${klant.klantId}.txt"`)
      .send(maakBrief(klant, scan.aangemaakt));
  });

  // Campagne: alle conceptbrieven in één bestand, gescheiden per klant.
  app.get('/api/scans/:id/brieven', (req, res) => {
    const scan = store.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan niet gevonden.' });
    const metLek = scan.klanten.filter((k) => k.leks.length > 0);
    if (metLek.length === 0) {
      return res.status(400).json({ error: 'Geen klanten met leks in deze scan.' });
    }
    const scheiding = `\n\n${'═'.repeat(64)}\n\n`;
    const bundel = metLek
      .map((k) => `── ${k.klantNaam} (${k.klantId}) ──\n\n${maakBrief(k, scan.aangemaakt)}`)
      .join(scheiding);
    res
      .type('text/plain; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="migratiebrieven.txt"')
      .send(bundel);
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

export { opvolging };
