import { useMemo, useState } from 'react';
import { api, euro, Kans, ScanResultaat, Segment } from '../api';

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
      <div className="dash-kop">
        <div>
          <p className="kicker">{scan.bron === 'demo' ? 'Demo-portefeuille' : 'Geüploade portefeuille'}</p>
          <h1>Scanresultaat</h1>
        </div>
        <div className="acties">
          <a className="btn btn-secondary" href={api.exportUrl(scan.scanId)} download>
            Exporteer leads (CSV)
          </a>
          <button className="btn btn-primary" onClick={onNieuweScan}>
            Nieuwe scan
          </button>
        </div>
      </div>

      <div className="tegels">
        <div className="tegel">
          <p className="label">Klanten</p>
          <p className="waarde">{scan.totalen.klanten}</p>
        </div>
        <div className="tegel">
          <p className="label">Polissen gescand</p>
          <p className="waarde">{scan.totalen.polissen}</p>
        </div>
        <div className="tegel">
          <p className="label">Leks gevonden</p>
          <p className="waarde">{scan.totalen.leks}</p>
        </div>
        <div className="tegel">
          <p className="label">Klanten met lek</p>
          <p className="waarde">
            {scan.totalen.klantenMetLek}
            <span style={{ fontSize: '1rem', color: 'var(--fog)' }}>
              {' '}
              / {scan.totalen.klanten}
            </span>
          </p>
        </div>
        <div className="tegel omzet">
          <p className="label">Geschatte jaaromzet</p>
          <p className="waarde">{euro(scan.totalen.geschatteJaarpremie)}</p>
        </div>
      </div>

      <div className="card verdeling">
        <h2>Waar zit de omzet — per lek-type</h2>
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

      <div className="filters">
        <div className="seg-groep" role="group" aria-label="Filter op segment">
          {(['alle', 'particulier', 'zakelijk'] as const).map((s) => (
            <button key={s} className={segment === s ? 'actief' : ''} onClick={() => setSegment(s)}>
              {s === 'alle' ? 'Alle segmenten' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="seg-groep" role="group" aria-label="Filter op kans">
          {(['alle', 'Cross-sell', 'Upsell', 'Optimalisatie'] as const).map((k) => (
            <button key={k} className={kans === k ? 'actief' : ''} onClick={() => setKans(k)}>
              {k === 'alle' ? 'Alle kansen' : k}
            </button>
          ))}
        </div>
      </div>

      <div className="sectie">
        <h2>
          Leads eruit — {leads.length} {leads.length === 1 ? 'lead' : 'leads'}, samen {euro(filterPremie)} per jaar
        </h2>
        <div className="tabel-wrap">
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
      </div>

      <div className="card sectie">
        <h2>Lek-score per klant</h2>
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
                  {k.branche ? ` · ${k.branche}` : ''}{' '}
                  <span className="badge segment">{k.segment}</span>
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
    </>
  );
}
