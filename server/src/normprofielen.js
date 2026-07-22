// Normprofielen voor de Leaklight-scan.
//
// Particulier: norm per productlijn. Zakelijk: normprofiel per SBI-hoofdgroep
// (eerste twee cijfers van de SBI-code), zoals op de website beschreven.

// Indicatieve jaarpremies voor ontbrekende producten (cross-sell).
export const INDICATIEVE_PREMIE = {
  rechtsbijstand: 132,
  avp: 78,
  opstal: 246,
  inboedel: 168,
  gebouw: 1450,
  inventaris: 620,
  bedrijfsschade: 980,
  avb: 540,
  cyber: 720,
};

// Premie per euro extra verzekerde som (voor onderverzekering / upsell).
export const SOM_TARIEF = {
  opstal: 0.0006,
  inboedel: 0.0012,
  gebouw: 0.001,
  inventaris: 0.0015,
};

// Onder deze dekkingsgraad (verzekerde som / actuele waarde) telt een polis
// als onderverzekerd.
export const ONDERVERZEKERING_GRENS = 0.9;

// Een polis die zo veel jaar niet is aangepast telt als verouderd risico.
export const VEROUDERD_NA_JAREN = 10;

export const PARTICULIERE_PRODUCTLIJNEN = ["opstal", "inboedel", "avp", "rechtsbijstand", "auto"];
export const ZAKELIJKE_PRODUCTLIJNEN = ["gebouw", "inventaris", "bedrijfsschade", "avb", "rechtsbijstand", "cyber"];

// Zakelijke normprofielen per SBI-hoofdgroep. `vereist` bepaalt welke
// productlijnen in de branche tot de norm horen.
const SBI_PROFIELEN = [
  { van: 1, tot: 9, naam: "Landbouw & delfstoffen", vereist: ["gebouw", "inventaris", "avb", "bedrijfsschade"] },
  { van: 10, tot: 33, naam: "Industrie", vereist: ["gebouw", "inventaris", "bedrijfsschade", "avb", "rechtsbijstand"] },
  { van: 41, tot: 43, naam: "Bouw", vereist: ["inventaris", "avb", "rechtsbijstand", "bedrijfsschade"] },
  { van: 45, tot: 47, naam: "Handel & detailhandel", vereist: ["gebouw", "inventaris", "bedrijfsschade", "avb"] },
  { van: 49, tot: 53, naam: "Transport & logistiek", vereist: ["inventaris", "avb", "bedrijfsschade", "rechtsbijstand"] },
  { van: 55, tot: 56, naam: "Horeca", vereist: ["gebouw", "inventaris", "bedrijfsschade", "avb"] },
  { van: 58, tot: 63, naam: "Informatie & IT", vereist: ["avb", "cyber", "rechtsbijstand"] },
  { van: 64, tot: 66, naam: "Financiële dienstverlening", vereist: ["avb", "cyber", "rechtsbijstand"] },
  { van: 68, tot: 68, naam: "Vastgoed", vereist: ["gebouw", "avb", "rechtsbijstand"] },
  { van: 69, tot: 75, naam: "Zakelijke dienstverlening", vereist: ["avb", "cyber", "rechtsbijstand"] },
  { van: 77, tot: 82, naam: "Verhuur & facilitair", vereist: ["inventaris", "avb", "bedrijfsschade"] },
  { van: 86, tot: 88, naam: "Zorg", vereist: ["avb", "rechtsbijstand", "cyber"] },
];

const STANDAARD_PROFIEL = { naam: "Overig", vereist: ["avb", "rechtsbijstand"] };

export function sbiProfiel(sbiCode) {
  const hoofdgroep = parseInt(String(sbiCode ?? "").slice(0, 2), 10);
  if (Number.isNaN(hoofdgroep)) return STANDAARD_PROFIEL;
  return SBI_PROFIELEN.find((p) => hoofdgroep >= p.van && hoofdgroep <= p.tot) ?? STANDAARD_PROFIEL;
}
