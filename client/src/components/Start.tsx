import { DragEvent, useCallback, useRef, useState } from 'react';
import { euro, ScanSamenvatting } from '../api';
import ScanCanvas, { demoCellen } from './ScanCanvas';

const VOORBEELD = `klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn;verzekerde_som;actuele_waarde;jaarpremie;laatst_gewijzigd
K1001;Jan de Vries;particulier;;P100234;opstal;310000;405000;245;2014-03-12
K1001;Jan de Vries;particulier;;P100235;auto;;;620;2023-08-01
Z2004;Grand Café De Markt;zakelijk;5630;P200871;avb;;;540;2022-06-15`;

// Dezelfde cijfers als in de hero van de website.
const STATS = [
  { target: 359, label: 'polissen gescand', prefix: '', money: false },
  { target: 104, label: 'leads gevonden', prefix: '', money: false },
  { target: 24600, label: 'extra jaarpremie', prefix: '€', money: true },
];

interface Props {
  bezig: boolean;
  eerdere: ScanSamenvatting[];
  onCsv: (csv: string) => void;
  onDemo: () => void;
  onOpen: (scanId: string) => void;
}

export default function Start({ bezig, eerdere, onCsv, onDemo, onOpen }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const statRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const [sleep, setSleep] = useState(false);
  const [runId, setRunId] = useState(0);
  const [cellen] = useState(demoCellen);

  const onProgress = useCallback((t: number) => {
    STATS.forEach((s, i) => {
      const el = statRefs.current[i];
      if (!el) return;
      const waarde = Math.round(t * s.target);
      el.textContent = s.prefix + (s.money ? waarde.toLocaleString('nl-NL') : String(waarde));
    });
  }, []);

  async function leesBestand(bestand: File | undefined) {
    if (!bestand) return;
    onCsv(await bestand.text());
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setSleep(false);
    leesBestand(e.dataTransfer.files[0]);
  }

  return (
    <>
      {/* Hero: zelfde opbouw en toon als de website */}
      <section className="container hero-grid">
        <div>
          <p className="kicker">Premielek-detectie tijdens polisconversie</p>
          <h1 className="display-xl hero-kop">Elke polis die je overzet, scannen we op gemiste premie.</h1>
          <p className="lede hero-tekst">
            Een conversie is nu data schuiven van A naar B. Leaklight draait mee tijdens die
            conversie en levert per klant de dekkingsgaten die blijven liggen, zonder je proces te
            vertragen. Laad je portefeuille en zie waar de premie lekt.
          </p>
          <div className="hero-acties">
            <button className="btn-primary" onClick={onDemo} disabled={bezig}>
              {bezig ? 'Scannen…' : 'Scan de demo-portefeuille'}
            </button>
            <a className="btn-ghost" href="#portefeuille">
              Eigen portefeuille laden
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </div>
          <p className="hero-voetnoot">Gebouwd voor: volmachtbedrijven · gevolmachtigd agenten · verzekeraars</p>
        </div>

        {/* Signatuurelement van de site: live scan als zwevende kaart */}
        <div className="card-hero tilt">
          <div className="scan-kop">
            <p className="scan-titel">
              <span className="pulse-dot" aria-hidden="true" />
              Leaklight · live scan
            </p>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setRunId((r) => r + 1)} aria-label="Scan opnieuw uitvoeren">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              opnieuw scannen
            </button>
          </div>
          <div
            className="scan-stage"
            role="img"
            aria-label="Visualisatie van een portefeuillescan: een periwinkle scanbalk veegt over een veld van polissen; polissen met een dekkingsgat lichten coraalrood op, gedekte polissen kleuren mint."
          >
            <ScanCanvas cellen={cellen} runId={runId} onProgress={onProgress} />
          </div>
          <div className="scan-stats">
            {STATS.map((s, i) => (
              <div key={s.label}>
                <p className="waarde" ref={(el) => (statRefs.current[i] = el)}>
                  {s.prefix}0
                </p>
                <p className="label">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="scan-voetnoot">Cijfers uit één echte, geanonimiseerde volmachtportefeuille (125 klanten).</p>
        </div>
      </section>

      {/* Portefeuille erin */}
      <section id="portefeuille" className="container" style={{ paddingBottom: 24 }}>
        <div className="sectie-kop reveal" style={{ margin: '0 auto', textAlign: 'center' }}>
          <p className="kicker">Portefeuille erin</p>
          <h2 className="display-lg">Het formaat dat je toch al hebt voor de conversie.</h2>
          <p className="lede" style={{ marginTop: 20 }}>
            Export uit ANVA/Level, CCS of Progress OpenEdge als CSV. De ruwe portefeuille wordt niet
            opgeslagen — alleen het scanresultaat, zodat je de opvolging kunt bijhouden.
          </p>
        </div>

        <div className="start-grid" style={{ marginTop: 56 }}>
          <div className="card hoverbaar tilt reveal">
            <h3>Sleep je CSV hierheen</h3>
            <p className="toelichting">Of klik om te bladeren. Eén regel per polis, scheidingsteken ; of , — Nederlandse getalnotatie wordt herkend.</p>
            <div
              className={`dropzone${sleep ? ' actief' : ''}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setSleep(true);
              }}
              onDragLeave={() => setSleep(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
            >
              {bezig ? 'Scannen…' : 'Sleep je CSV hierheen, of klik om te bladeren'}
            </div>
            <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={(e) => leesBestand(e.target.files?.[0] ?? undefined)} />
          </div>

          <div className="card hoverbaar tilt reveal">
            <h3>Of bekijk de demo</h3>
            <p className="toelichting">
              Een portefeuille van 48 klanten (32 particulier, 16 zakelijk met echte SBI-codes) zoals
              hij uit een conversierun komt — inclusief de leks die daar in de praktijk in zitten.
            </p>
            <button className="btn-primary" onClick={onDemo} disabled={bezig}>
              {bezig ? 'Scannen…' : 'Scan de demo-portefeuille'}
            </button>
          </div>
        </div>

        <div className="formaat reveal" style={{ marginTop: 32 }}>
          Verwacht formaat:
          <code>{VOORBEELD}</code>
          Productlijnen — particulier: opstal, inboedel, avp, rechtsbijstand, auto · zakelijk:
          gebouw, inventaris, bedrijfsschade, avb, rechtsbijstand, cyber.
        </div>
      </section>

      {/* Eerdere scans: opvolging loopt door over sessies heen */}
      {eerdere.length > 0 && (
        <section className="container" style={{ paddingTop: 56 }}>
          <div className="sectie-kop reveal" style={{ margin: '0 auto', textAlign: 'center' }}>
            <p className="kicker">Eerdere scans</p>
            <h2 className="display-lg">Pak de opvolging weer op.</h2>
          </div>
          <div className="card reveal" style={{ marginTop: 40, maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
            {eerdere.map((s) => (
              <div className="scan-rij" key={s.scanId}>
                <span>
                  <span className="klantnaam">
                    {new Date(s.aangemaakt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>{' '}
                  <span className="badge segment">{s.bron === 'demo' ? 'demo' : 'upload'}</span>
                  <br />
                  <span className="klantid">
                    {s.totalen.klanten} klanten · {s.totalen.leks} leks · {euro(s.totalen.geschatteJaarpremie)} geschat
                  </span>
                </span>
                <span className="scan-opvolging">
                  {s.opvolging.gerealiseerd > 0 ? (
                    <span className="gerealiseerd">{euro(s.opvolging.gerealiseerd)} gerealiseerd</span>
                  ) : (
                    <span className="klantid">{s.opvolging.telling.nieuw} leads nog niet opgepakt</span>
                  )}
                </span>
                <button className="btn-ghost" onClick={() => onOpen(s.scanId)} disabled={bezig}>
                  openen
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
