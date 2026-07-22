// Deterministische demo-portefeuille: 32 particuliere en 16 zakelijke klanten
// zoals ze uit een ANVA/CCS-export zouden komen, inclusief realistische leks.

const VOORNAMEN = ['Jan', 'Sanne', 'Pieter', 'Fatima', 'Kees', 'Lotte', 'Mohammed', 'Ingrid', 'Bas', 'Willem', 'Anouk', 'Hendrik', 'Marieke', 'Tom', 'Els', 'Ruud'];
const ACHTERNAMEN = ['de Vries', 'Jansen', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'Bos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'de Wit', 'Dijkstra'];
const BEDRIJVEN = [
  ['Bakkerij Het Krentenbrood', '1071'],
  ['Aannemersbedrijf Van Steen', '4120'],
  ['Grand Café De Markt', '5630'],
  ['Transportbedrijf Snelweg', '4941'],
  ['Softwarehuis Codewerk', '6201'],
  ['Advocatenkantoor Recht & Co', '6910'],
  ['Fysiopraktijk Beweging', '8691'],
  ['Groothandel Vers & Zo', '4631'],
  ['Installatiebedrijf Warmte', '4322'],
  ['Kapsalon Knip', '9602'],
  ['Administratiekantoor Cijfers', '6920'],
  ['Restaurant De Gouden Lepel', '5610'],
  ['Webbureau Pixelpracht', '6312'],
  ['Autogarage De Sleutel', '4520'],
  ['Kinderopvang De Vlinder', '8891'],
  ['Makelaardij Huis & Thuis', '6831'],
];

function maakRandom(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoPortefeuille() {
  const rand = maakRandom(20260722);
  const kies = (lijst) => lijst[Math.floor(rand() * lijst.length)];
  const tussen = (min, max) => min + rand() * (max - min);
  const datum = (jaarMin, jaarMax) => {
    const jaar = Math.floor(tussen(jaarMin, jaarMax + 1));
    const maand = String(Math.floor(tussen(1, 13))).padStart(2, '0');
    const dag = String(Math.floor(tussen(1, 29))).padStart(2, '0');
    return `${jaar}-${maand}-${dag}`;
  };

  const klanten = [];
  let polisTeller = 100000;
  const polis = (productlijn, extra = {}) => ({
    polisnummer: `P${++polisTeller}`,
    productlijn,
    verzekerdeSom: null,
    actueleWaarde: null,
    jaarpremie: 0,
    laatstGewijzigd: datum(2018, 2025),
    ...extra,
  });

  for (let i = 0; i < 32; i++) {
    const naam = `${kies(VOORNAMEN)} ${kies(ACHTERNAMEN)}`;
    const polissen = [];
    const herbouw = Math.round(tussen(280, 520)) * 1000;
    const inboedelWaarde = Math.round(tussen(45, 110)) * 1000;

    const heeftOpstal = rand() < 0.85;
    const heeftInboedel = heeftOpstal ? rand() < 0.8 : rand() < 0.9;

    if (heeftOpstal) {
      // Bij ~35% is de som jaren niet geïndexeerd: onderverzekering.
      const onderverzekerd = rand() < 0.35;
      polissen.push(
        polis('opstal', {
          verzekerdeSom: Math.round(herbouw * (onderverzekerd ? tussen(0.6, 0.85) : tussen(0.95, 1.05))),
          actueleWaarde: herbouw,
          jaarpremie: Math.round(herbouw * 0.0006),
          laatstGewijzigd: onderverzekerd ? datum(2010, 2015) : datum(2019, 2025),
        }),
      );
    }
    if (heeftInboedel) {
      const onderverzekerd = rand() < 0.25;
      polissen.push(
        polis('inboedel', {
          verzekerdeSom: Math.round(inboedelWaarde * (onderverzekerd ? tussen(0.55, 0.85) : tussen(0.95, 1.1))),
          actueleWaarde: inboedelWaarde,
          jaarpremie: Math.round(inboedelWaarde * 0.0012),
        }),
      );
    }
    if (rand() < 0.6) polissen.push(polis('avp', { jaarpremie: Math.round(tussen(60, 90)) }));
    if (rand() < 0.45) polissen.push(polis('rechtsbijstand', { jaarpremie: Math.round(tussen(110, 160)) }));
    if (rand() < 0.7) polissen.push(polis('auto', { jaarpremie: Math.round(tussen(400, 900)) }));
    // Enkele klanten hebben per ongeluk een tweede AVP of autopolis.
    if (rand() < 0.12) polissen.push(polis(rand() < 0.5 ? 'avp' : 'auto', { jaarpremie: Math.round(tussen(70, 500)) }));

    if (polissen.length === 0) polissen.push(polis('auto', { jaarpremie: Math.round(tussen(400, 900)) }));

    klanten.push({ klantId: `K${1000 + i}`, klantNaam: naam, segment: 'particulier', sbiCode: null, polissen });
  }

  BEDRIJVEN.forEach(([naam, sbi], i) => {
    const polissen = [];
    const gebouwWaarde = Math.round(tussen(400, 1600)) * 1000;
    const inventarisWaarde = Math.round(tussen(60, 400)) * 1000;

    if (rand() < 0.7) {
      const onderverzekerd = rand() < 0.4;
      polissen.push(
        polis('gebouw', {
          verzekerdeSom: Math.round(gebouwWaarde * (onderverzekerd ? tussen(0.55, 0.85) : tussen(0.95, 1.05))),
          actueleWaarde: gebouwWaarde,
          jaarpremie: Math.round(gebouwWaarde * 0.001),
          laatstGewijzigd: onderverzekerd ? datum(2009, 2014) : datum(2019, 2025),
        }),
      );
    }
    if (rand() < 0.75) {
      polissen.push(
        polis('inventaris', {
          verzekerdeSom: Math.round(inventarisWaarde * tussen(0.7, 1.05)),
          actueleWaarde: inventarisWaarde,
          jaarpremie: Math.round(inventarisWaarde * 0.0015),
        }),
      );
    }
    if (rand() < 0.45) polissen.push(polis('bedrijfsschade', { jaarpremie: Math.round(tussen(700, 1400)) }));
    if (rand() < 0.8) polissen.push(polis('avb', { jaarpremie: Math.round(tussen(400, 800)) }));
    if (rand() < 0.35) polissen.push(polis('rechtsbijstand', { jaarpremie: Math.round(tussen(250, 450)) }));
    if (rand() < 0.2) polissen.push(polis('cyber', { jaarpremie: Math.round(tussen(500, 900)) }));

    if (polissen.length === 0) polissen.push(polis('avb', { jaarpremie: Math.round(tussen(400, 800)) }));

    klanten.push({ klantId: `Z${2000 + i}`, klantNaam: naam, segment: 'zakelijk', sbiCode: sbi, polissen });
  });

  return klanten;
}
