import { useState } from 'react';
import { api, ScanResultaat } from './api';
import Dashboard from './components/Dashboard';
import Start from './components/Start';

export default function App() {
  const [scan, setScan] = useState<ScanResultaat | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function voerUit(actie: () => Promise<ScanResultaat>) {
    setBezig(true);
    setFout(null);
    try {
      setScan(await actie());
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">
            Leak<span className="accent">light</span>
          </span>
          <span className="sub">House of Intelligence</span>
        </div>
        <span className="sub" style={{ color: 'var(--fog)', fontSize: '0.85rem' }}>
          Premielek-detectie · particulier &amp; zakelijk
        </span>
      </header>

      {fout && <div className="fout">{fout}</div>}

      {scan ? (
        <Dashboard scan={scan} onNieuweScan={() => setScan(null)} />
      ) : (
        <Start bezig={bezig} onCsv={(csv) => voerUit(() => api.scanCsv(csv))} onDemo={() => voerUit(() => api.scanDemo())} />
      )}

      <footer className="voet">
        Leaklight — House of Intelligence B.V. · De scan draait in het geheugen; portefeuilles worden niet opgeslagen.
      </footer>
    </div>
  );
}
