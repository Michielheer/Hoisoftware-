import { useCallback, useMemo, useRef, useState } from 'react';
import { api, euro, Kans, ScanResultaat, Segment } from '../api';
import ScanCanvas from './ScanCanvas';

type SegmentFilter = 'alle' | Segment;
type KansFilter = 'alle' | Kans;

const badgeClass = (kind: Kans) => `badge ${kind.toLowerCase()}`;

interface Props {
  scan: ScanResultaat;
  onNieuweScan: () => void;
}

export default function Dashboard({ scan, onNieuweScan }: Props) {
  const [segment, setSegment] = useState<SegmentFilter>('alle');
  const [kans, setKans] = useState<KansFilter>('alle');
  const [runId, setRunId] = useState(0);
  const statRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  // De tellers naast de live-scan lopen mee met de scanbalk, zoals op de site.
  const stats = useMemo(
    () => [
      { target: scan.totalen.polissen, label: 'polissen gescand', prefix: '', money: false },
      { target: scan.totalen.leks, label: 'leks gevonden', prefix: '', money: false },
      { target: scan.totalen.geschatteJaarpremie, label: 'extra jaarpremie', prefix: '€', money: true },
    ],
    [scan],
  );

  const onProgress = useCallback(
    (t: number) => {
      stats.forEach((s, i) => {
        const el = statRefs.current[i];
        if (!el) return;
        const waarde = Math.round(t * s.target);
        el.textContent = s.prefix + (s.money ? waarde.toLocaleString('nl-NL') : String(waarde));
      });
    },
    [stats],
  );

  const leads = useMemo(
    () =>
      scan.leads.filter(
        (l) => (segment === 'alle' || l.segment === segment) && (kans === 'alle' || l.kind === kans),
      ),
    [scan, segment, kans],
  );

  const klanten = useMemo(
    () => scan.klanten.filter((k) => (segment === 'alle' || k.segment === segment) && k.lekScore > 0),
    [scan, segment],
  );

  const filterPremie = leads.reduce((s, l) => s + l.geschatteJaarpremie, 0);
  const maxTypePremie = Math.max(...scan.perLekType.map((t) => t.geschatteJaarpremie), 1);

  return (
    <>
      <div className="container dash-kop">
        <div>
          <p className="kicker">{scan.bron === 'demo' ? 'Demo-portefeuille' : 'Geüploade portefeuille'} · {new Date(scan.aangemaakt).toLocaleDateString('nl-NL')}</p>
          <h1 className="display-lg">Dezelfde migratie, maar nu rolt eruit wat mist.</h1>
        </div>
        <div className="dash-acties">
          <a className="btn-ghost" href={api.exportUrl(scan.scanId)} download>
            Exporteer leads (CSV)
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
          </a>
          <button className="btn-primary klein" onClick={onNieuweScan}>
            Nieuwe scan
          </button>
        </div>
      </div>

      <div className="container tegels">
        <div className="tegel reveal">
          <p className="label">Klanten</p>
          <p className="waarde">{scan.totalen.klanten}</p>
        </div>
        <div className="tegel reveal">
          <p className="label">Polissen gescand</p>
          <p className="waarde">{scan.totalen.polissen}</p>
        </div>
        <div className="tegel reveal">
          <p className="label">Leks gevonden</p>
          <p className="waarde">{scan.totalen.leks}</p>
        </div>
        <div className="tegel reveal">
          <p className="label">Klanten met lek</p>
          <p className="waarde">
            {scan.totalen.klantenMetLek}
            <span style={{ fontSize: '1rem', color: 'var(--fog)' }}> / {scan.totalen.klanten}</span>
          </p>
        </div>
        <div className="tegel omzet reveal">
          <p className="label">Geschatte jaaromzet</p>
          <p className="waarde">{euro(scan.totalen.geschatteJaarpremie)}</p>
        </div>
      </div>

      {/* Live-scan met de échte portefeuille: elke tegel is een gescande polis */}
      <section className="container sectie" style={{ display: 'grid', gap: 24 }}>
        <div className="card-hero tilt reveal" style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
          <div className="scan-kop">
            <p className="scan-titel">
              <span className="pulse-dot" aria-hidden="true" />
              Jouw portefeuille · live scan
            </p>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setRunId((r) => r + 1)} aria-label="Scan opnieuw afspelen">
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
            aria-label={`Visualisatie van jouw portefeuillescan: ${scan.totalen.polissen} polissen als tegels; polissen met een dekkingsgat lichten coraalrood op, gedekte polissen kleuren mint.`}
          >
            <ScanCanvas cellen={scan.grid} runId={runId} onProgress={onProgress} />
          </div>
          <div className="scan-stats">
            {stats.map((s, i) => (
              <div key={s.label}>
                <p className="waarde" ref={(el) => (statRefs.current[i] = el)}>
                  {s.prefix}0
                </p>
                <p className="label">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="legenda">
            <span>
              <span className="blok" style={{ background: 'var(--mint)' }} /> Gedekt
            </span>
            <span>
              <span className="blok" style={{ background: 'var(--coral)' }} /> Dekkingsgat
            </span>
            <span>
              <span className="lijn" style={{ background: 'var(--periwinkle)' }} /> Scanlijn
            </span>
          </div>
        </div>
      </section>

      {/* Waar zit de omzet */}
      <section className="container sectie">
        <div className="sectie-kop reveal">
          <p className="kicker">Wat we vinden</p>
          <h2 className="display-lg">Waar de premie lekt, per lek-type.</h2>
        </div>
        <div className="card reveal" style={{ marginTop: 36 }}>
          {scan.perLekType.map((t) => (
            <div className="balk-rij" key={t.type}>
              <span>
                {t.naam} <span className={badgeClass(t.kind)}>{t.kind}</span>
              </span>
              <div className="balk-spoor">
                <div className="balk" style={{ width: `${(t.geschatteJaarpremie / maxTypePremie) * 100}%` }} />
              </div>
              <span className="aantal">{t.aantal}×</span>
              <span className="premie">{euro(t.geschatteJaarpremie)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Leads eruit */}
      <section className="container sectie">
        <div className="sectie-kop reveal">
          <p className="kicker">Leads eruit</p>
          <h2 className="display-lg">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'}, samen {euro(filterPremie)} per jaar.
          </h2>
          <p className="lede" style={{ marginTop: 20 }}>
            Per klant: welk gat, welk product, welke geschatte jaarpremie. Direct klaar voor de
            migratiebrief of het CRM.
          </p>
        </div>

        <div className="filters">
          <div className="seg-groep" role="group" aria-label="Filter op segment">
            {(['alle', 'particulier', 'zakelijk'] as const).map((s) => (
              <button key={s} className="seg-btn" aria-pressed={segment === s} onClick={() => setSegment(s)}>
                {s === 'alle' ? 'Alle segmenten' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="seg-groep" role="group" aria-label="Filter op kans">
            {(['alle', 'Cross-sell', 'Upsell', 'Optimalisatie'] as const).map((k) => (
              <button key={k} className="seg-btn" aria-pressed={kans === k} onClick={() => setKans(k)}>
                {k === 'alle' ? 'Alle kansen' : k}
              </button>
            ))}
          </div>
        </div>

        <div className="tabel-wrap reveal">
          {leads.length === 0 ? (
            <p className="leeg">Geen leads binnen dit filter.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Klant</th>
                  <th>Lek</th>
                  <th>Kans</th>
                  <th>Product</th>
                  <th>Toelichting</th>
                  <th className="premie">Jaarpremie</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={`${l.klantId}-${l.type}-${l.productlijn}-${i}`}>
                    <td>
                      <span className="klantnaam">{l.klantNaam}</span>
                      <br />
                      <span className="klantid">
                        {l.klantId}
                        {l.sbiCode ? ` · SBI ${l.sbiCode}` : ''}
                      </span>
                    </td>
                    <td>{l.naam}</td>
                    <td>
                      <span className={badgeClass(l.kind)}>{l.kind}</span>
                    </td>
                    <td>{l.product}</td>
                    <td className="omschrijving">{l.omschrijving}</td>
                    <td className="premie">{euro(l.geschatteJaarpremie)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Lek-score per klant */}
      <section className="container sectie">
        <div className="sectie-kop reveal">
          <p className="kicker">Prioriteit</p>
          <h2 className="display-lg">Lek-score per klant.</h2>
        </div>
        <div className="card reveal" style={{ marginTop: 36 }}>
          {klanten.length === 0 ? (
            <p className="leeg">Geen klanten met een lek binnen dit filter.</p>
          ) : (
            klanten.map((k) => (
              <div className="score-rij" key={k.klantId}>
                <span>
                  <span className="klantnaam">{k.klantNaam}</span>
                  <br />
                  <span className="klantid">
                    {k.aantalPolissen} {k.aantalPolissen === 1 ? 'polis' : 'polissen'}
                    {k.branche ? ` · ${k.branche}` : ''} <span className="badge segment">{k.segment}</span>
                  </span>
                </span>
                <div className="score-spoor">
                  <div className="score-balk" style={{ width: `${k.lekScore}%` }} />
                </div>
                <span className="score">{k.lekScore}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
