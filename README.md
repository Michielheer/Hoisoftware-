# Leaklight — House of Intelligence

Premielek-detectie tijdens polisconversie: laad een portefeuille-export, toets elke
polis aan het normprofiel en rol dekkingsgaten eruit als concrete cross- en
upsell-leads. De applicatie achter de website van House of Intelligence B.V.

## Wat het doet

1. **Portefeuille erin** — upload een CSV-export (zoals uit ANVA/Level, CCS of
   Progress OpenEdge), of scan de meegeleverde demo-portefeuille van 48 klanten.
2. **Scan** — elke polis wordt getoetst aan een normprofiel:
   - *Particulier*: per productlijn (opstal, inboedel, AVP, rechtsbijstand, auto).
   - *Zakelijk*: normprofiel per SBI-hoofdgroep (gebouw, inventaris,
     bedrijfsschade, AVB, rechtsbijstand, cyber).
3. **Leads eruit** — per klant: welk gat, welk product, welke geschatte
   jaarpremie. Dashboard met lek-scores en verdeling per lek-type, plus een
   CSV-export klaar voor het CRM en een kant-en-klare conceptbrief
   (migratiebrief) per klant.

Het dashboard bevat de twee visualisaties van de website, gekoppeld aan echte
data: de live-scan (elke tegel een gescande polis; coral = lek, mint = gedekt)
en het zakelijke staafdiagram met de dekking naast het normprofiel per SBI.

### De lek-types

| Lek | Kans |
| --- | --- |
| Ontbrekende rechtsbijstand | Cross-sell |
| Onderverzekering (som < 90% van actuele waarde) | Upsell |
| Losse opstal zonder inboedel (of andersom) | Cross-sell |
| Geen aansprakelijkheid (AVP) | Cross-sell |
| Dubbele dekking | Optimalisatie |
| Verouderd risico (10+ jaar niet aangepast) | Upsell |
| Ontbrekende branchedekking (zakelijk, per SBI) | Cross-sell |

### Opvolging

Scans worden bewaard (in `server/data/scans.json`; de ruwe portefeuille zelf
wordt nooit opgeslagen). Elke lead heeft een opvolgstatus — nieuw → benaderd →
offerte → gesloten/afgewezen — en het dashboard zet de gerealiseerde en lopende
jaarpremie naast de geschatte omzet. Vanaf het startscherm pak je een eerdere
scan weer op. Voor campagnes zijn alle conceptbrieven in één keer te
downloaden.

## Structuur

```
client/   React + TypeScript frontend (Vite), in de Leaklight-huisstijl
server/   Express REST API met de scan-engine (normprofielen, scanner, CSV)
```

## Aan de slag

Vereist Node.js 20 of nieuwer.

```bash
npm install

# Ontwikkelmodus: server (poort 3001) + frontend (poort 5173) tegelijk
npm run dev
```

Open daarna http://localhost:5173.

## Productie

```bash
npm run build   # bouwt de frontend naar client/dist
npm start       # Express serveert de API én de frontend op poort 3001
```

## CSV-formaat

Eén regel per polis, scheidingsteken `;` of `,`. Nederlandse getalnotatie
(`310.000,00`) wordt herkend.

```csv
klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn;verzekerde_som;actuele_waarde;jaarpremie;laatst_gewijzigd
K1001;Jan de Vries;particulier;;P100234;opstal;310000;405000;245;2014-03-12
Z2004;Grand Café De Markt;zakelijk;5630;P200871;avb;;;540;2022-06-15
```

Verplichte kolommen: `klant_id`, `klant_naam`, `segment`, `polisnummer`,
`productlijn`. Productlijnen — particulier: `opstal`, `inboedel`, `avp`,
`rechtsbijstand`, `auto`; zakelijk: `gebouw`, `inventaris`, `bedrijfsschade`,
`avb`, `rechtsbijstand`, `cyber`.

## API

| Methode | Pad | Omschrijving |
| ------- | --- | ------------ |
| GET | `/api/health` | Statuscheck |
| POST | `/api/scan` | Scan een CSV (raw `text/csv`-body of JSON `{ "csv": "..." }`) |
| POST | `/api/scan/demo` | Scan de demo-portefeuille |
| GET | `/api/scans/:id/leads.csv` | Exporteer de leads van een scan als CSV |
| GET | `/api/scans` | Lijst van bewaarde scans met opvolg-samenvatting |
| GET | `/api/scans/:id` | Eén bewaarde scan openen |
| PATCH | `/api/scans/:id/leads/:leadId` | Opvolgstatus van een lead bijwerken (`{ "status": "gesloten" }`) |
| GET | `/api/scans/:id/klanten/:klantId/brief` | Conceptbrief (migratiebrief) voor één klant |
| GET | `/api/scans/:id/brieven` | Alle conceptbrieven in één bestand (campagne) |

## Tests

```bash
npm test
```

Dekt de scan-regels (alle lek-types, particulier en zakelijk), de CSV-parser en
de API-endpoints via Node's ingebouwde testrunner.
