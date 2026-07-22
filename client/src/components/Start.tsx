import { DragEvent, useRef, useState } from 'react';

const VOORBEELD = `klant_id;klant_naam;segment;sbi_code;polisnummer;productlijn;verzekerde_som;actuele_waarde;jaarpremie;laatst_gewijzigd
K1001;Jan de Vries;particulier;;P100234;opstal;310000;405000;245;2014-03-12
K1001;Jan de Vries;particulier;;P100235;auto;;;620;2023-08-01
Z2004;Grand Café De Markt;zakelijk;5630;P200871;avb;;;540;2022-06-15`;

interface Props {
  bezig: boolean;
  onCsv: (csv: string) => void;
  onDemo: () => void;
}

export default function Start({ bezig, onCsv, onDemo }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [sleep, setSleep] = useState(false);

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
      <div className="hero">
        <p className="kicker">Premielek-detectie tijdens polisconversie</p>
        <h1>
          Elke polis een lek-score. <br />
          Wat mist, rolt eruit als lead.
        </h1>
        <p>
          Laad je portefeuille-export uit ANVA/Level, CCS of Progress. Leaklight toetst elke polis
          aan het normprofiel — particulier per productlijn, zakelijk per SBI-code — en zet elk
          dekkingsgat klaar als concrete cross- of upsell-lead.
        </p>
      </div>

      <div className="start-grid">
        <div className="card">
          <h2>Portefeuille erin</h2>
          <p>Sleep een CSV-export hierheen of kies een bestand. Er wordt niets opgeslagen: de scan draait in het geheugen.</p>
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
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => leesBestand(e.target.files?.[0] ?? undefined)}
          />
        </div>

        <div className="card">
          <h2>Of bekijk de demo</h2>
          <p>
            Een portefeuille van 48 klanten (32 particulier, 16 zakelijk) zoals hij uit een
            conversierun komt — inclusief de leks die daar in de praktijk in zitten.
          </p>
          <button className="btn btn-primary" onClick={onDemo} disabled={bezig}>
            {bezig ? 'Scannen…' : 'Scan de demo-portefeuille'}
          </button>
        </div>
      </div>

      <div className="formaat" style={{ maxWidth: 860, margin: '28px auto 0' }}>
        Verwacht formaat (één regel per polis, scheidingsteken <strong>;</strong> of <strong>,</strong>):
        <code>{VOORBEELD}</code>
        Productlijnen particulier: opstal, inboedel, avp, rechtsbijstand, auto · zakelijk: gebouw,
        inventaris, bedrijfsschade, avb, rechtsbijstand, cyber.
      </div>
    </>
  );
}
