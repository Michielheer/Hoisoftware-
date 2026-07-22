// CSV in- en uitvoer voor portefeuilles en leads.
//
// Verwacht invoerformaat (één regel per polis, scheidingsteken ; of ,):
//   klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn;
//   verzekerde_som;actuele_waarde;jaarpremie;laatst_gewijzigd

const VERPLICHTE_KOLOMMEN = ['klant_id', 'klant_naam', 'segment', 'polisnummer', 'productlijn'];

function splitsRegel(regel, scheider) {
  const velden = [];
  let huidig = '';
  let inQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (inQuotes) {
      if (c === '"' && regel[i + 1] === '"') {
        huidig += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        huidig += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === scheider) {
      velden.push(huidig);
      huidig = '';
    } else {
      huidig += c;
    }
  }
  velden.push(huidig);
  return velden.map((v) => v.trim());
}

function getal(waarde) {
  if (waarde == null || waarde === '') return null;
  // Zowel "12.500,50" (NL) als "12500.50" accepteren.
  const genormaliseerd = /,\d{1,2}$/.test(waarde)
    ? waarde.replace(/\./g, '').replace(',', '.')
    : waarde.replace(/,/g, '');
  const n = Number(genormaliseerd);
  return Number.isFinite(n) ? n : null;
}

// Bovengrens op de invoer: voorkomt dat één upload de server het geheugen
// uit drukt. 100.000 polissen is ruim boven een reële volmachtportefeuille.
const MAX_RIJEN = 100_000;
const MAX_VELDLENGTE = 200;

const kort = (waarde) => (waarde ?? '').slice(0, MAX_VELDLENGTE);

export function parsePortefeuille(csvTekst, opties = {}) {
  const maxRijen = opties.maxRijen ?? MAX_RIJEN;
  const regels = csvTekst
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  if (regels.length < 2) {
    throw new Error('Het CSV-bestand bevat geen datarijen.');
  }
  if (regels.length - 1 > maxRijen) {
    throw new Error(`Het CSV-bestand heeft meer dan ${maxRijen.toLocaleString('nl-NL')} rijen; splits de portefeuille op.`);
  }

  const scheider = (regels[0].match(/;/g)?.length ?? 0) >= (regels[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const kop = splitsRegel(regels[0], scheider).map((k) => k.toLowerCase().replace(/\s+/g, '_'));

  const ontbrekend = VERPLICHTE_KOLOMMEN.filter((k) => !kop.includes(k));
  if (ontbrekend.length > 0) {
    throw new Error(`Verplichte kolommen ontbreken: ${ontbrekend.join(', ')}.`);
  }

  const klanten = new Map();
  for (let i = 1; i < regels.length; i++) {
    const velden = splitsRegel(regels[i], scheider);
    const rij = Object.fromEntries(kop.map((k, j) => [k, velden[j] ?? '']));

    const klantId = kort(rij.klant_id);
    if (!klantId) continue;

    if (!klanten.has(klantId)) {
      const segment = rij.segment?.toLowerCase() === 'zakelijk' ? 'zakelijk' : 'particulier';
      klanten.set(klantId, {
        klantId,
        klantNaam: kort(rij.klant_naam) || klantId,
        segment,
        sbiCode: kort(rij.sbi_code) || null,
        polissen: [],
      });
    }

    klanten.get(klantId).polissen.push({
      polisnummer: kort(rij.polisnummer) || `rij-${i}`,
      productlijn: kort(rij.productlijn).toLowerCase(),
      verzekerdeSom: getal(rij.verzekerde_som),
      actueleWaarde: getal(rij.actuele_waarde),
      jaarpremie: getal(rij.jaarpremie) ?? 0,
      laatstGewijzigd: kort(rij.laatst_gewijzigd) || null,
    });
  }

  if (klanten.size === 0) {
    throw new Error('Geen klanten gevonden in het CSV-bestand.');
  }
  return [...klanten.values()];
}

function csvVeld(waarde) {
  let s = String(waarde ?? '');
  // Formule-injectie: Excel voert cellen uit die met =, +, -, @ of een tab
  // beginnen. Een apostrof ervoor maakt het weer gewone tekst.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function leadsNaarCsv(leads) {
  const kop = [
    'klant_id',
    'klant_naam',
    'segment',
    'sbi_code',
    'lek_type',
    'kans',
    'product',
    'geschatte_jaarpremie',
    'omschrijving',
  ];
  const rijen = leads.map((l) =>
    [l.klantId, l.klantNaam, l.segment, l.sbiCode ?? '', l.naam, l.kind, l.product, l.geschatteJaarpremie, l.omschrijving]
      .map(csvVeld)
      .join(';'),
  );
  return [kop.join(';'), ...rijen].join('\n');
}
