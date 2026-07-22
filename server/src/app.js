import compression from 'compression';
import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  foutafhandeling,
  maakLimiter,
  securityHeaders,
  veilig,
  veiligeBestandsnaam,
} from './beveiliging.js';
import { maakBrief } from './brief.js';
import { leadsNaarCsv, parsePortefeuille } from './csv.js';
import { demoPortefeuille } from './demo.js';
import { scanPortefeuille } from './scanner.js';
import { LEAD_STATUSSEN, ScanStore, opvolging } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(opties = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(compression());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '25mb' }));

  // Scannen is de zware operatie en krijgt een strakke limiet; de rest van de
  // API een ruime (statussen bijwerken gaat in korte series).
  const scanLimiter = maakLimiter({ vensterMs: 60_000, max: 12 });
  const apiLimiter = maakLimiter({ vensterMs: 60_000, max: 600 });
  app.use('/api', apiLimiter);

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

  app.post(
    '/api/scan',
    scanLimiter,
    veilig(async (req, res) => {
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
    }),
  );

  app.post(
    '/api/scan/demo',
    scanLimiter,
    veilig(async (req, res) => {
      res.status(201).json(await bewaarScan(scanPortefeuille(demoPortefeuille()), 'demo'));
    }),
  );

  app.get('/api/scans', (req, res) => {
    res.json(store.lijst());
  });

  app.get('/api/scans/:id', (req, res) => {
    const scan = store.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan niet gevonden.' });
    res.json(scan);
  });

  // Geeft bewust alleen de bijgewerkte lead en de opvolg-samenvatting terug,
  // niet de hele scan: statussen wisselen gebeurt in series en de frontend
  // werkt zijn eigen kopie bij.
  app.patch(
    '/api/scans/:id/leads/:leadId',
    veilig(async (req, res) => {
      const status = req.body?.status;
      if (!LEAD_STATUSSEN.includes(status)) {
        return res.status(400).json({ error: `Ongeldige status; kies uit ${LEAD_STATUSSEN.join(', ')}.` });
      }
      const scan = await store.zetStatus(req.params.id, req.params.leadId, status);
      if (!scan) return res.status(404).json({ error: 'Scan of lead niet gevonden.' });
      const lead = scan.leads.find((l) => l.leadId === req.params.leadId);
      res.json({ lead, opvolging: opvolging(scan) });
    }),
  );

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
      .set('Content-Disposition', `attachment; filename="migratiebrief-${veiligeBestandsnaam(klant.klantId)}.txt"`)
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
  app.use(
    express.static(clientDist, {
      index: false,
      // Vite-assets hebben een content-hash in de naam en mogen agressief
      // gecachet worden; index.html juist niet.
      setHeaders: (res, bestandsPad) => {
        if (bestandsPad.includes(`${path.sep}assets${path.sep}`)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use(foutafhandeling);

  return app;
}

export { opvolging };
