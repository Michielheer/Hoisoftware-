import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { leadsNaarCsv, parsePortefeuille } from '../src/csv.js';
import { scanPortefeuille } from '../src/scanner.js';
import { veiligeBestandsnaam } from '../src/beveiliging.js';

async function makeServer() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'leaklight-sec-'));
  const app = await createApp({ dataFile: path.join(dir, 'scans.json') });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: `http://localhost:${server.address().port}` };
}

test('security-headers staan op elke API-response', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('scan-endpoint wordt na 12 verzoeken per minuut afgeremd', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  let laatste = 0;
  for (let i = 0; i < 13; i++) {
    laatste = (await fetch(`${base}/api/scan/demo`, { method: 'POST' })).status;
  }
  assert.equal(laatste, 429);
});

test('CSV-export ontsmet formule-injectie', () => {
  const csv = leadsNaarCsv([
    {
      klantId: 'K1',
      klantNaam: '=SUM(A1:A9)',
      segment: 'particulier',
      sbiCode: null,
      naam: 'Onderverzekering',
      kind: 'Upsell',
      product: 'Opstal',
      geschatteJaarpremie: 60,
      omschrijving: '+cmd|test',
    },
  ]);
  assert.match(csv, /'=SUM\(A1:A9\)/);
  assert.match(csv, /'\+cmd\|test/);
});

test('te veel rijen in de upload wordt geweigerd', () => {
  const kop = 'klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn';
  const rijen = Array.from({ length: 6 }, (_, i) => `K${i};Klant ${i};particulier;;P${i};auto`);
  assert.throws(
    () => parsePortefeuille([kop, ...rijen].join('\n'), { maxRijen: 5 }),
    /meer dan 5 rijen/,
  );
});

test('grid wordt begrensd tot een steekproef bij grote portefeuilles', () => {
  const klanten = Array.from({ length: 600 }, (_, i) => ({
    klantId: `K${i}`,
    klantNaam: `Klant ${i}`,
    segment: 'particulier',
    sbiCode: null,
    polissen: [
      {
        polisnummer: `P${i}`,
        productlijn: 'auto',
        verzekerdeSom: null,
        actueleWaarde: null,
        jaarpremie: 500,
        laatstGewijzigd: '2024-01-01',
      },
    ],
  }));
  const r = scanPortefeuille(klanten, { vandaag: new Date('2026-07-22').getTime() });
  assert.equal(r.totalen.polissen, 600);
  assert.equal(r.grid.length, 480);
});

test('bestandsnamen uit klantdata worden ontsmet', () => {
  assert.equal(veiligeBestandsnaam('K1001'), 'K1001');
  assert.equal(veiligeBestandsnaam('../../etc/passwd"\r\n'), '.._.._etc_passwd___');
  assert.equal(veiligeBestandsnaam(''), 'bestand');
});
