import { useCallback, useMemo, useRef, useState } from 'react';
import { api, euro, Kans, LEAD_STATUSSEN, LeadStatus, ScanResultaat, Segment } from '../api';
import CoverageBars from './CoverageBars';
import ScanCanvas from './ScanCanvas';

type SegmentFilter = 'alle' | Segment;
type KansFilter = 'alle' | Kans;
type StatusFilter = 'alle' | 'open' | 'lopend' | 'gesloten' | 'afgewezen';

const badgeClass = (kind: Kans) => `badge ${kind.toLowerCase()}`;

const STATUS_LABEL: Record<LeadStatus, string> = {
  nieuw: 'Nieuw',
  benaderd: 'Benaderd',
  offerte: 'Offerte',
  gesloten: 'Gesloten',
  afgewezen: 'Afgewezen',
};

const matchtStatus = (status: LeadStatus, filter: StatusFilter) => {
  if (filter === 'alle') return true;
  if (filter === 'open') return status === 'nieuw';
  if (filter === 'lopend') return status === 'benaderd' || status === 'offerte';
  return status === filter;
};

interface Props {
  scan: ScanResultaat;
  onScanUpdate: (scan: ScanResultaat) => void;
  onNieuweScan: () => void;
}

export default function Dashboard({ scan, onScanUpdate, onNieuweScan }: Props) {
  const [segment, setSegment] = useState<SegmentFilter>('alle');
  const [kans, setKans] = useState<KansFilter>('alle');
  const [status, setStatus] = useState<StatusFilter>('alle');

  async function wijzigStatus(leadId: string, nieuweStatus: LeadStatus) {
    // Optimistisch bijwerken: de tabel reageert direct, de server bevestigt.
    const vorige = scan;
    onScanUpdate({
      ...scan,
      leads: scan.leads.map((l) => (l.leadId === leadId ? { ...l, status: nieuweStatus } : l)),
    });
    try {
      await api.zetStatus(scan.scanId, leadId, nieuweStatus);
    } catch {
      onScanUpdate(vorige);
    }
  }
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
        (l) =>
          (segment === 'alle' || l.segment === segment) &&
          (kans === 'alle' || l.kind === kans) &&
          matchtStatus(l.status, status),
      ),
    [scan, segment, kans, status],
  );

  // Opvolging: wat de scan belooft (geschat) naast wat er al binnen is.
  const gerealiseerd = scan.leads
    .filter((l) => l.status === 'gesloten')
    .reduce((s, l) => s + l.geschatteJaarpremie, 0);
  const inBehandeling = scan.leads
    .filter((l) => l.status === 'benaderd' || l.status === 'offerte')
    .reduce((s, l) => s + l.geschatteJaarpremie, 0);

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
          <a className="btn-ghost" href={api.brievenUrl(scan.scanId)} download title="Alle conceptbrieven in één bestand">
            Alle brieven
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16v16H4zM4 7l8 6 8-6" />
            </svg>
          </a>
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
        <div className="tegel reveal">
          <p className="label">In behandeling</p>
          <p className="waarde">{euro(inBehandeling)}</p>
        </div>
        <div className="tegel gerealiseerd reveal">
          <p className="label">Gerealiseerd</p>
          <p className="waarde">{euro(gerealiseerd)}</p>
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
          {scan.grid.length < scan.totalen.polissen && (
            <p className="scan-voetnoot" style={{ textAlign: 'center' }}>
              Weergave: steekproef van {scan.grid.length} van de {scan.totalen.polissen} polissen.
            </p>
          )}
        </div>
      </section>

      {/* Zakelijk: dekking t.o.v. het normprofiel per SBI (Analyse-sectie van de site) */}
      {scan.dekkingZakelijk.length > 0 && (
        <section className="container sectie analyse-grid">
          <div className="reveal">
            <p className="kicker">Analyse · zakelijk</p>
            <h2 className="display-lg" style={{ marginTop: 16 }}>
              Dekking naast het normprofiel per branche.
            </h2>
            <p className="lede" style={{ marginTop: 20 }}>
              Voor bedrijven bepalen we het normprofiel op basis van de SBI-code. De periwinkle lijn
              is de norm: het deel van je zakelijke klanten dat deze dekking volgens hun branche
              hoort te hebben. Mint is wat er nu toereikend gedekt is — coral is het tekort, en dus
              de kans.
            </p>
            <ul className="dekking-lijst">
              {[...scan.dekkingZakelijk]
                .sort((a, b) => b.norm - b.actueel - (a.norm - a.actueel))
                .slice(0, 3)
                .filter((d) => d.norm > d.actueel)
                .map((d) => (
                  <li key={d.lijn}>
                    <span className="klantnaam">{d.naam}</span>
                    <br />
                    <span className="klantid">
                      {d.toereikend} van de {d.vereist} klanten die het nodig hebben zijn toereikend
                      gedekt.
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="card-hero tilt reveal">
            <div className="scan-kop">
              <p className="scan-titel">
                <span className="pulse-dot" aria-hidden="true" />
                Normprofiel per SBI-code
              </p>
            </div>
            <div
              className="scan-stage"
              role="img"
              aria-label="Staafdiagram: per categorie de huidige dekking in mint, met een coral kap voor het tekort tot het normprofiel en een periwinkle lijn op de norm."
            >
              <CoverageBars categorieen={scan.dekkingZakelijk} />
            </div>
            <div className="legenda">
              <span>
                <span className="blok" style={{ background: 'var(--mint)' }} /> Huidige dekking
              </span>
              <span>
                <span className="blok" style={{ background: 'var(--coral)' }} /> Tekort t.o.v. norm
              </span>
              <span>
                <span className="lijn" style={{ background: 'var(--periwinkle)' }} /> Normprofiel
              </span>
            </div>
          </div>
        </section>
      )}

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
          <div className="seg-groep" role="group" aria-label="Filter op opvolgstatus">
            {(
              [
                ['alle', 'Alle statussen'],
                ['open', 'Nog niet opgepakt'],
                ['lopend', 'In behandeling'],
                ['gesloten', 'Gesloten'],
                ['afgewezen', 'Afgewezen'],
              ] as [StatusFilter, string][]
            ).map(([s, label]) => (
              <button key={s} className="seg-btn" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {label}
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.leadId} className={l.status === 'afgewezen' ? 'afgewezen' : ''}>
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
                    <td>
                      <select
                        className={`status-select status-${l.status}`}
                        value={l.status}
                        onChange={(e) => wijzigStatus(l.leadId, e.target.value as LeadStatus)}
                        aria-label={`Status van lead ${l.naam} voor ${l.klantNaam}`}
                      >
                        {LEAD_STATUSSEN.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
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
                <span className="score-acties">
                  <span className="score">{k.lekScore}</span>
                  <a
                    className="btn-ghost"
                    style={{ fontSize: 13 }}
                    href={api.briefUrl(scan.scanId, k.klantId)}
                    download
                    title={`Conceptbrief voor ${k.klantNaam} downloaden`}
                  >
                    conceptbrief
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                    </svg>
                  </a>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
