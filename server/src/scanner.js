// De Leaklight scan-engine: toetst elke polis aan het normprofiel en rolt
// dekkingsgaten eruit als leads, precies zoals de website belooft.
//
// De zes lek-types:
//   rechtsbijstand-ontbreekt  Cross-sell
//   onderverzekering          Upsell
//   halve-woningdekking       Cross-sell (opstal zonder inboedel of andersom)
//   avp-ontbreekt             Cross-sell
//   dubbele-dekking           Optimalisatie
//   verouderd-risico          Upsell
// Plus, zakelijk: ontbrekende branche-dekking volgens het SBI-normprofiel.

import {
  INDICATIEVE_PREMIE,
  ONDERVERZEKERING_GRENS,
  SOM_TARIEF,
  VEROUDERD_NA_JAREN,
  sbiProfiel,
} from './normprofielen.js';

export const LEK_TYPES = {
  'rechtsbijstand-ontbreekt': { naam: 'Ontbrekende rechtsbijstand', kind: 'Cross-sell' },
  onderverzekering: { naam: 'Onderverzekering', kind: 'Upsell' },
  'halve-woningdekking': { naam: 'Losse opstal zonder inboedel', kind: 'Cross-sell' },
  'avp-ontbreekt': { naam: 'Geen aansprakelijkheid (AVP)', kind: 'Cross-sell' },
  'dubbele-dekking': { naam: 'Dubbele dekking', kind: 'Optimalisatie' },
  'verouderd-risico': { naam: 'Verouderd risico', kind: 'Upsell' },
  'branche-dekking-ontbreekt': { naam: 'Ontbrekende branchedekking', kind: 'Cross-sell' },
};

const SCORE_GEWICHT = { 'Cross-sell': 24, Upsell: 18, Optimalisatie: 10 };

// Korte labels voor de tegels in de live-scan-visualisatie (zoals op de site).
const PRODUCT_AFKORTING = {
  opstal: 'OP',
  inboedel: 'IN',
  avp: 'AVP',
  rechtsbijstand: 'RB',
  auto: 'AUTO',
  gebouw: 'GEB',
  inventaris: 'INV',
  bedrijfsschade: 'BS',
  avb: 'AVB',
  cyber: 'CYB',
};

const PRODUCT_NAMEN = {
  opstal: 'Opstal',
  inboedel: 'Inboedel',
  avp: 'Aansprakelijkheid (AVP)',
  rechtsbijstand: 'Rechtsbijstand',
  auto: 'Auto',
  gebouw: 'Bedrijfsgebouw',
  inventaris: 'Inventaris & goederen',
  bedrijfsschade: 'Bedrijfsschade',
  avb: 'Aansprakelijkheid (AVB)',
  cyber: 'Cyber',
};

export function productNaam(lijn) {
  return PRODUCT_NAMEN[lijn] ?? lijn;
}

function euro(n) {
  return Math.round(n);
}

function lek(type, productlijn, omschrijving, premie) {
  const def = LEK_TYPES[type];
  return {
    type,
    naam: def.naam,
    kind: def.kind,
    productlijn,
    product: productNaam(productlijn),
    omschrijving,
    geschatteJaarpremie: euro(premie),
  };
}

function jarenSinds(datum, vandaag) {
  const d = new Date(datum);
  if (Number.isNaN(d.getTime())) return 0;
  return (vandaag - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function heeft(polissen, lijn) {
  return polissen.some((p) => p.productlijn === lijn);
}

function scanGedeeld(polissen, vandaag) {
  const leks = [];

  // Onderverzekering: verzekerde som zakt onder de norm t.o.v. actuele waarde.
  for (const p of polissen) {
    const tarief = SOM_TARIEF[p.productlijn];
    if (!tarief || !p.actueleWaarde || !p.verzekerdeSom) continue;
    const graad = p.verzekerdeSom / p.actueleWaarde;
    if (graad < ONDERVERZEKERING_GRENS) {
      const tekort = p.actueleWaarde - p.verzekerdeSom;
      leks.push(
        lek(
          'onderverzekering',
          p.productlijn,
          `${productNaam(p.productlijn)} verzekerd voor €${p.verzekerdeSom.toLocaleString('nl-NL')} bij een actuele waarde van €${p.actueleWaarde.toLocaleString('nl-NL')} (${Math.round(graad * 100)}% gedekt).`,
          tekort * tarief,
        ),
      );
    }
  }

  // Dubbele dekking: twee polissen op dezelfde productlijn.
  const perLijn = new Map();
  for (const p of polissen) {
    perLijn.set(p.productlijn, [...(perLijn.get(p.productlijn) ?? []), p]);
  }
  for (const [lijn, groep] of perLijn) {
    if (groep.length > 1) {
      const laagste = Math.min(...groep.map((p) => p.jaarpremie || 0));
      leks.push(
        lek(
          'dubbele-dekking',
          lijn,
          `${groep.length} polissen op ${productNaam(lijn).toLowerCase()} (${groep.map((p) => p.polisnummer).join(', ')}). Opzeggen bespaart circa €${euro(laagste)} per jaar.`,
          laagste,
        ),
      );
    }
  }

  // Verouderd risico: polis die al jaren niet meer is aangepast.
  for (const p of polissen) {
    const jaren = jarenSinds(p.laatstGewijzigd, vandaag);
    if (jaren >= VEROUDERD_NA_JAREN) {
      leks.push(
        lek(
          'verouderd-risico',
          p.productlijn,
          `Polis ${p.polisnummer} (${productNaam(p.productlijn).toLowerCase()}) is ${Math.floor(jaren)} jaar niet aangepast; situatie is vrijwel zeker veranderd.`,
          (p.jaarpremie || 0) * 0.15,
        ),
      );
    }
  }

  return leks;
}

function scanParticulier(polissen, vandaag) {
  const leks = scanGedeeld(polissen, vandaag);
  const heeftWoon = heeft(polissen, 'opstal') || heeft(polissen, 'inboedel');

  if (heeftWoon && !heeft(polissen, 'rechtsbijstand')) {
    leks.push(
      lek(
        'rechtsbijstand-ontbreekt',
        'rechtsbijstand',
        'Woonpolis aanwezig, rechtsbijstand niet. Het meest voorkomende gat, en het makkelijkst te dichten.',
        INDICATIEVE_PREMIE.rechtsbijstand,
      ),
    );
  }

  if (polissen.length > 0 && !heeft(polissen, 'avp')) {
    leks.push(
      lek(
        'avp-ontbreekt',
        'avp',
        'Pakket zonder particuliere aansprakelijkheid. Klein bedrag, groot risico.',
        INDICATIEVE_PREMIE.avp,
      ),
    );
  }

  if (heeft(polissen, 'opstal') && !heeft(polissen, 'inboedel')) {
    leks.push(
      lek(
        'halve-woningdekking',
        'inboedel',
        'Opstal gedekt, inboedel nergens te vinden. Halve dekking op het grootste bezit.',
        INDICATIEVE_PREMIE.inboedel,
      ),
    );
  } else if (heeft(polissen, 'inboedel') && !heeft(polissen, 'opstal')) {
    leks.push(
      lek(
        'halve-woningdekking',
        'opstal',
        'Inboedel gedekt, opstal nergens te vinden. Mogelijk huurder — check de situatie.',
        INDICATIEVE_PREMIE.opstal,
      ),
    );
  }

  return leks;
}

function scanZakelijk(klant, polissen, vandaag) {
  const leks = scanGedeeld(polissen, vandaag);
  const profiel = sbiProfiel(klant.sbiCode);

  for (const lijn of profiel.vereist) {
    if (!heeft(polissen, lijn)) {
      leks.push(
        lek(
          'branche-dekking-ontbreekt',
          lijn,
          `${productNaam(lijn)} hoort tot het normprofiel voor ${profiel.naam.toLowerCase()} (SBI ${klant.sbiCode || 'onbekend'}) maar ontbreekt.`,
          INDICATIEVE_PREMIE[lijn] ?? 0,
        ),
      );
    }
  }

  return { leks, branche: profiel.naam };
}

// Portefeuille: [{ klantId, klantNaam, segment, sbiCode?, polissen: [...] }]
// (zoals geleverd door parsePortefeuille in csv.js)
export function scanPortefeuille(klanten, opties = {}) {
  const vandaag = opties.vandaag ?? Date.now();
  const resultaatKlanten = [];

  for (const klant of klanten) {
    let leks;
    let branche;
    if (klant.segment === 'zakelijk') {
      ({ leks, branche } = scanZakelijk(klant, klant.polissen, vandaag));
    } else {
      leks = scanParticulier(klant.polissen, vandaag);
    }

    const score = Math.min(100, leks.reduce((s, l) => s + SCORE_GEWICHT[l.kind], 0));
    resultaatKlanten.push({
      klantId: klant.klantId,
      klantNaam: klant.klantNaam,
      segment: klant.segment,
      sbiCode: klant.sbiCode || null,
      branche: branche ?? null,
      aantalPolissen: klant.polissen.length,
      lekScore: score,
      leks,
    });
  }

  const leads = resultaatKlanten.flatMap((k) =>
    k.leks.map((l, i) => ({
      leadId: `${k.klantId}-${i}`,
      status: 'nieuw',
      klantId: k.klantId,
      klantNaam: k.klantNaam,
      segment: k.segment,
      sbiCode: k.sbiCode,
      ...l,
    })),
  );

  const perLekType = Object.entries(LEK_TYPES)
    .map(([type, def]) => {
      const groep = leads.filter((l) => l.type === type);
      return {
        type,
        naam: def.naam,
        kind: def.kind,
        aantal: groep.length,
        geschatteJaarpremie: euro(groep.reduce((s, l) => s + l.geschatteJaarpremie, 0)),
      };
    })
    .filter((t) => t.aantal > 0)
    .sort((a, b) => b.geschatteJaarpremie - a.geschatteJaarpremie);

  // Lek-productlijnen per klant één keer indexeren, zodat grid en
  // dekkingZakelijk in O(n) blijven — ook bij portefeuilles van tienduizenden
  // polissen.
  const lekLijnenPerKlant = new Map(
    resultaatKlanten.map((k) => [k.klantId, new Set(k.leks.map((l) => l.productlijn))]),
  );
  const onderverzekerdPerKlant = new Map(
    resultaatKlanten.map((k) => [
      k.klantId,
      new Set(k.leks.filter((l) => l.type === 'onderverzekering').map((l) => l.productlijn)),
    ]),
  );

  // Eén tegel per gescande polis voor de live-scan-visualisatie:
  // coral als er op die productlijn een lek zit, anders mint. Boven de
  // MAX_GRID_CELLEN tonen we een gelijkmatige steekproef, zodat de payload en
  // de canvas-animatie klein blijven; de frontend meldt dat dan.
  const alleCellen = klanten.flatMap((klant) => {
    const lekLijnen = lekLijnenPerKlant.get(klant.klantId);
    return klant.polissen.map((p) => ({
      label: PRODUCT_AFKORTING[p.productlijn] ?? (p.productlijn || '?').slice(0, 3).toUpperCase(),
      leak: lekLijnen.has(p.productlijn),
    }));
  });
  const MAX_GRID_CELLEN = 480;
  const grid =
    alleCellen.length <= MAX_GRID_CELLEN
      ? alleCellen
      : Array.from(
          { length: MAX_GRID_CELLEN },
          (_, i) => alleCellen[Math.floor((i * alleCellen.length) / MAX_GRID_CELLEN)],
        );

  // Dekking t.o.v. het normprofiel per zakelijke categorie, voor het
  // staafdiagram uit de Analyse-sectie van de site: mint = huidige dekking,
  // coral = tekort tot de norm, periwinkle lijn = normprofiel.
  const zakelijk = klanten.filter((k) => k.segment === 'zakelijk');
  const dekkingZakelijk = [];
  if (zakelijk.length > 0) {
    const telling = new Map(); // lijn -> { vereist, toereikend }
    for (const klant of zakelijk) {
      const profielLijnen = new Set(sbiProfiel(klant.sbiCode).vereist);
      const eigenLijnen = new Set(klant.polissen.map((p) => p.productlijn));
      const onderverzekerd = onderverzekerdPerKlant.get(klant.klantId);
      for (const lijn of ['gebouw', 'inventaris', 'bedrijfsschade', 'avb', 'rechtsbijstand', 'cyber']) {
        if (!telling.has(lijn)) telling.set(lijn, { vereist: 0, toereikend: 0 });
        const t = telling.get(lijn);
        if (profielLijnen.has(lijn)) t.vereist += 1;
        if (eigenLijnen.has(lijn) && !onderverzekerd.has(lijn)) t.toereikend += 1;
      }
    }
    for (const [lijn, t] of telling) {
      if (t.vereist > 0) {
        dekkingZakelijk.push({
          lijn,
          code: PRODUCT_AFKORTING[lijn],
          naam: PRODUCT_NAMEN[lijn],
          actueel: t.toereikend / zakelijk.length,
          norm: t.vereist / zakelijk.length,
          toereikend: t.toereikend,
          vereist: t.vereist,
          totaal: zakelijk.length,
        });
      }
    }
  }

  return {
    grid,
    dekkingZakelijk,
    totalen: {
      klanten: klanten.length,
      polissen: klanten.reduce((s, k) => s + k.polissen.length, 0),
      leks: leads.length,
      klantenMetLek: resultaatKlanten.filter((k) => k.leks.length > 0).length,
      geschatteJaarpremie: euro(leads.reduce((s, l) => s + l.geschatteJaarpremie, 0)),
    },
    perLekType,
    klanten: resultaatKlanten.sort((a, b) => b.lekScore - a.lekScore),
    leads: leads.sort((a, b) => b.geschatteJaarpremie - a.geschatteJaarpremie),
  };
}
