import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { createApp } from '../src/app.js';

async function makeServer(dataFile) {
  const file = dataFile ?? path.join(await mkdtemp(path.join(os.tmpdir(), 'leaklight-')), 'scans.json');
  const app = await createApp({ dataFile: file });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: `http://localhost:${server.address().port}`, dataFile: file };
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

test('leadstatus bijwerken, opvolging in de scanlijst en persistentie op schijf', async (t) => {
  const { server, base, dataFile } = await makeServer();
  t.after(() => server.close());

  const scan = await (await fetch(`${base}/api/scan/demo`, { method: 'POST' })).json();
  const lead = scan.leads[0];
  assert.equal(lead.status, 'nieuw');
  assert.ok(lead.leadId);

  // Status naar gesloten: telt als gerealiseerde jaarpremie.
  let res = await fetch(`${base}/api/scans/${scan.scanId}/leads/${lead.leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'gesloten' }),
  });
  assert.equal(res.status, 200);
  const bijgewerkt = await res.json();
  assert.equal(bijgewerkt.lead.status, 'gesloten');
  assert.equal(bijgewerkt.opvolging.telling.gesloten, 1);

  const lijst = await (await fetch(`${base}/api/scans`)).json();
  assert.equal(lijst.length, 1);
  assert.equal(lijst[0].opvolging.telling.gesloten, 1);
  assert.equal(lijst[0].opvolging.gerealiseerd, lead.geschatteJaarpremie);

  // Ongeldige status wordt geweigerd.
  res = await fetch(`${base}/api/scans/${scan.scanId}/leads/${lead.leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'kwijt' }),
  });
  assert.equal(res.status, 400);

  // Een nieuwe serverinstantie op hetzelfde databestand ziet de scan én de status.
  const tweede = await makeServer(dataFile);
  t.after(() => tweede.server.close());
  const herladen = await (await fetch(`${tweede.base}/api/scans/${scan.scanId}`)).json();
  assert.equal(herladen.leads.find((l) => l.leadId === lead.leadId).status, 'gesloten');
});

test('alle brieven als bundel via de API', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  const scan = await (await fetch(`${base}/api/scan/demo`, { method: 'POST' })).json();
  const metLek = scan.klanten.filter((k) => k.leks.length > 0);

  const res = await fetch(`${base}/api/scans/${scan.scanId}/brieven`);
  assert.equal(res.status, 200);
  const bundel = await res.text();
  assert.equal((bundel.match(/Met vriendelijke groet/g) ?? []).length, metLek.length);
  assert.match(bundel, /══════/);
});
