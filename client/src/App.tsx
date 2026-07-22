import { useEffect, useState } from 'react';
import { api, ScanResultaat } from './api';
import Dashboard from './components/Dashboard';
import Logo from './components/Logo';
import Start from './components/Start';
import { initEffects } from './effects';

export default function App() {
  const [scan, setScan] = useState<ScanResultaat | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Scroll-reveal en kaart-tilt opnieuw koppelen na elke view-wissel.
  useEffect(() => initEffects(), [scan, fout]);

  async function voerUit(actie: () => Promise<ScanResultaat>) {
    setBezig(true);
    setFout(null);
    try {
      const resultaat = await actie();
      setScan(resultaat);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <header className="nav-wrap">
        <nav className="container nav" aria-label="Hoofdnavigatie">
          <a
            className="nav-brand"
            href="https://houseofintelligence.nl"
            target="_blank"
            rel="noopener"
            aria-label="House of Intelligence"
          >
            <Logo />
            <span className="naam">
              House of <u>Intelligence</u>
            </span>
          </a>
          <div className="nav-rechts">
            <span className="nav-label">Leaklight · premielek-detectie</span>
            {scan && (
              <button className="btn-primary klein" onClick={() => setScan(null)}>
                Nieuwe scan
              </button>
            )}
          </div>
        </nav>
      </header>

      <main>
        {fout && (
          <div className="container">
            <div className="fout">{fout}</div>
          </div>
        )}

        {scan ? (
          <Dashboard scan={scan} onNieuweScan={() => setScan(null)} />
        ) : (
          <Start bezig={bezig} onCsv={(csv) => voerUit(() => api.scanCsv(csv))} onDemo={() => voerUit(() => api.scanDemo())} />
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <div className="footer-brand">
              <Logo />
              <span className="naam font-display" style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--indigo-ink)' }}>
                House of{' '}
                <u style={{ textDecorationColor: 'var(--periwinkle)', textDecorationThickness: 2, textUnderlineOffset: 4 }}>
                  Intelligence
                </u>
              </span>
            </div>
            <p className="footer-tagline">
              Werkende software voor het Nederlandse volmacht- en verzekeringsdomein.
              Premielek-detectie, risico-inschatting en conversiepraktijk onder één dak.
            </p>
          </div>
          <div className="footer-meta">
            <p style={{ margin: 0 }}>
              Leaklight — de scan draait in het geheugen; portefeuilles worden niet opgeslagen.
              <br />
              <a href="mailto:info@houseofintelligence.nl">info@houseofintelligence.nl</a>
              {' · '}
              <a href="https://www.linkedin.com/company/house-of-intelligence/" target="_blank" rel="noopener">
                LinkedIn
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
