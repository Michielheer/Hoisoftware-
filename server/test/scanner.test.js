import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanPortefeuille } from '../src/scanner.js';
import { parsePortefeuille } from '../src/csv.js';
import { demoPortefeuille } from '../src/demo.js';

const VANDAAG = new Date('2026-07-22').getTime();

const klant = (overrides) => ({
  klantId: 'K1',
  klantNaam: 'Test Klant',
  segment: 'particulier',
  sbiCode: null,
  polissen: [],
  ...overrides,
});

const polis = (productlijn, overrides = {}) => ({
  polisnummer: 'P1',
  productlijn,
  verzekerdeSom: null,
  actueleWaarde: null,
  jaarpremie: 100,
  laatstGewijzigd: '2024-01-01',
  ...overrides,
});

function lekTypes(resultaat) {
  return resultaat.klanten[0].leks.map((l) => l.type).sort();
}

test('woonpolis zonder rechtsbijstand en zonder AVP geeft twee cross-sell-leks', () => {
  const r = scanPortefeuille(
    [klant({ polissen: [polis('opstal', { verzekerdeSom: 400000, actueleWaarde: 400000 }), polis('inboedel', { polisnummer: 'P2', verzekerdeSom: 80000, actueleWaarde: 80000 })] })],
    { vandaag: VANDAAG },
  );
  assert.deepEqual(lekTypes(r), ['avp-ontbreekt', 'rechtsbijstand-ontbreekt']);
  assert.equal(r.totalen.leks, 2);
});

test('onderverzekering wordt gesignaleerd onder de 90%-grens', () => {
  const r = scanPortefeuille(
    [klant({ polissen: [polis('opstal', { verzekerdeSom: 300000, actueleWaarde: 400000 }), polis('inboedel', { polisnummer: 'P2', verzekerdeSom: 80000, actueleWaarde: 80000 }), polis('avp', { polisnummer: 'P3' }), polis('rechtsbijstand', { polisnummer: 'P4' })] })],
    { vandaag: VANDAAG },
  );
  assert.deepEqual(lekTypes(r), ['onderverzekering']);
  // Tekort 100.000 × 0,6‰ = €60 geschatte extra jaarpremie.
  assert.equal(r.leads[0].geschatteJaarpremie, 60);
});

test('opstal zonder inboedel geeft halve-woningdekking', () => {
  const r = scanPortefeuille(
    [klant({ polissen: [polis('opstal', { verzekerdeSom: 400000, actueleWaarde: 400000 }), polis('avp', { polisnummer: 'P2' }), polis('rechtsbijstand', { polisnummer: 'P3' })] })],
    { vandaag: VANDAAG },
  );
  assert.deepEqual(lekTypes(r), ['halve-woningdekking']);
});

test('dubbele dekking en verouderd risico worden gevonden', () => {
  const r = scanPortefeuille(
    [klant({ polissen: [polis('avp'), polis('avp', { polisnummer: 'P2', jaarpremie: 70 }), polis('auto', { polisnummer: 'P3', laatstGewijzigd: '2012-05-01' })] })],
    { vandaag: VANDAAG },
  );
  assert.deepEqual(lekTypes(r), ['dubbele-dekking', 'verouderd-risico']);
});

test('zakelijk: IT-bedrijf zonder cyber krijgt branche-lek via SBI-normprofiel', () => {
  const r = scanPortefeuille(
    [
      klant({
        klantId: 'Z1',
        segment: 'zakelijk',
        sbiCode: '6201',
        polissen: [polis('avb'), polis('rechtsbijstand', { polisnummer: 'P2' })],
      }),
    ],
    { vandaag: VANDAAG },
  );
  assert.deepEqual(lekTypes(r), ['branche-dekking-ontbreekt']);
  assert.equal(r.klanten[0].branche, 'Informatie & IT');
  assert.equal(r.leads[0].productlijn, 'cyber');
});

test('gezonde portefeuille geeft geen leks en score nul', () => {
  const r = scanPortefeuille(
    [
      klant({
        polissen: [
          polis('opstal', { verzekerdeSom: 400000, actueleWaarde: 400000 }),
          polis('inboedel', { polisnummer: 'P2', verzekerdeSom: 80000, actueleWaarde: 80000 }),
          polis('avp', { polisnummer: 'P3' }),
          polis('rechtsbijstand', { polisnummer: 'P4' }),
        ],
      }),
    ],
    { vandaag: VANDAAG },
  );
  assert.equal(r.totalen.leks, 0);
  assert.equal(r.klanten[0].lekScore, 0);
});

test('CSV-parser leest NL-getallen en groepeert per klant', () => {
  const csv = [
    'klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn;verzekerde_som;actuele_waarde;jaarpremie;laatst_gewijzigd',
    'K1;Jan de Vries;particulier;;P1;opstal;300.000,00;400000;240;2015-03-01',
    'K1;Jan de Vries;particulier;;P2;avp;;;78;2023-01-01',
    'Z1;"Bakkerij; De Krent";zakelijk;1071;P3;avb;;;540;2022-06-01',
  ].join('\n');
  const klanten = parsePortefeuille(csv);
  assert.equal(klanten.length, 2);
  assert.equal(klanten[0].polissen.length, 2);
  assert.equal(klanten[0].polissen[0].verzekerdeSom, 300000);
  assert.equal(klanten[1].klantNaam, 'Bakkerij; De Krent');
  assert.equal(klanten[1].segment, 'zakelijk');
});

test('demo-portefeuille is deterministisch en bevat leks', () => {
  const a = scanPortefeuille(demoPortefeuille(), { vandaag: VANDAAG });
  const b = scanPortefeuille(demoPortefeuille(), { vandaag: VANDAAG });
  assert.deepEqual(a.totalen, b.totalen);
  assert.equal(a.totalen.klanten, 48);
  assert.ok(a.totalen.leks > 20, `verwacht ruim voldoende leks, kreeg ${a.totalen.leks}`);
  assert.ok(a.totalen.geschatteJaarpremie > 0);
});
