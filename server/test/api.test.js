import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

async function makeServer() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: `http://localhost:${server.address().port}` };
}

test('demo-scan en CSV-export via de API', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  const res = await fetch(`${base}/api/scan/demo`, { method: 'POST' });
  assert.equal(res.status, 201);
  const scan = await res.json();
  assert.ok(scan.scanId);
  assert.ok(scan.totalen.leks > 0);
  assert.ok(Array.isArray(scan.leads));

  const csvRes = await fetch(`${base}/api/scans/${scan.scanId}/leads.csv`);
  assert.equal(csvRes.status, 200);
  const csv = await csvRes.text();
  assert.match(csv.split('\n')[0], /^klant_id;klant_naam/);
  assert.equal(csv.split('\n').length, scan.leads.length + 1);
});

test('CSV-upload wordt gescand, ongeldige invoer geeft 400', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  const csv = [
    'klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn;verzekerde_som;actuele_waarde;jaarpremie;laatst_gewijzigd',
    'K1;Jan de Vries;particulier;;P1;opstal;400000;400000;240;2024-03-01',
  ].join('\n');

  let res = await fetch(`${base}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csv,
  });
  assert.equal(res.status, 201);
  const scan = await res.json();
  assert.equal(scan.totalen.klanten, 1);
  // Opstal zonder inboedel, rechtsbijstand en AVP: drie leks.
  assert.equal(scan.totalen.leks, 3);

  res = await fetch(`${base}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv: 'kolom_a;kolom_b\n1;2' }),
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Verplichte kolommen/);

  res = await fetch(`${base}/api/scans/bestaat-niet/leads.csv`);
  assert.equal(res.status, 404);
});

test('migratiebrief per klant via de API', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  const scan = await (await fetch(`${base}/api/scan/demo`, { method: 'POST' })).json();
  const metLek = scan.klanten.find((k) => k.leks.length > 0);

  const res = await fetch(`${base}/api/scans/${scan.scanId}/klanten/${metLek.klantId}/brief`);
  assert.equal(res.status, 200);
  const brief = await res.text();
  assert.match(brief, new RegExp(metLek.klantNaam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(brief, /Met vriendelijke groet/);
  assert.match(brief, /1\. /);

  const nietGevonden = await fetch(`${base}/api/scans/${scan.scanId}/klanten/bestaat-niet/brief`);
  assert.equal(nietGevonden.status, 404);
});
