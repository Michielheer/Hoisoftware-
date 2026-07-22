// Conceptbrief per klant: het "leads eruit"-vervolg van de site — de lek-leads
// direct klaar voor de migratiebrief. Platte tekst, zodat hij zo in Word,
// e-mail of het CRM kan worden geplakt en aangepast.

import { euro } from './format.js';

function aanhef(klant) {
  if (klant.segment === 'zakelijk') {
    return `Geachte relatie,\n\nBetreft: uw verzekeringspakket van ${klant.klantNaam}`;
  }
  return `Geachte ${klant.klantNaam},`;
}

export function maakBrief(klant, aangemaakt) {
  const datum = new Date(aangemaakt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const regels = [];
  regels.push(datum);
  regels.push('');
  regels.push(aanhef(klant));
  regels.push('');
  regels.push(
    'In het kader van de overgang van uw polissen naar ons nieuwe administratiesysteem hebben wij uw volledige verzekeringspakket doorgelicht. Uw dekkingen zijn ongewijzigd meeverhuisd. Bij deze controle vielen ons wel enkele punten op die wij graag met u doornemen:',
  );
  regels.push('');

  klant.leks.forEach((lek, i) => {
    regels.push(`${i + 1}. ${lek.naam} — ${lek.product}`);
    regels.push(`   ${lek.omschrijving}`);
    if (lek.kind === 'Optimalisatie') {
      regels.push(`   Mogelijke besparing: circa ${euro(lek.geschatteJaarpremie)} per jaar.`);
    } else {
      regels.push(`   Indicatieve jaarpremie: circa ${euro(lek.geschatteJaarpremie)}.`);
    }
    regels.push('');
  });

  regels.push(
    'Deze punten zijn gebaseerd op de gegevens zoals die nu in onze administratie staan. Kloppen die niet meer met uw situatie, dan horen wij dat uiteraard ook graag — dan zetten wij het direct goed.',
  );
  regels.push('');
  regels.push(
    'Wilt u een of meer punten met ons doornemen? Reageer dan op deze brief of plan direct een afspraak met uw adviseur. U betaalt bij ons nooit voor advies over uw bestaande pakket.',
  );
  regels.push('');
  regels.push('Met vriendelijke groet,');
  regels.push('');
  regels.push('House of Intelligence B.V.');

  return regels.join('\n');
}
