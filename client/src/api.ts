export type Segment = 'particulier' | 'zakelijk';
export type Kans = 'Cross-sell' | 'Upsell' | 'Optimalisatie';

export interface Lek {
  type: string;
  naam: string;
  kind: Kans;
  productlijn: string;
  product: string;
  omschrijving: string;
  geschatteJaarpremie: number;
}

export interface Lead extends Lek {
  klantId: string;
  klantNaam: string;
  segment: Segment;
  sbiCode: string | null;
}

export interface KlantResultaat {
  klantId: string;
  klantNaam: string;
  segment: Segment;
  sbiCode: string | null;
  branche: string | null;
  aantalPolissen: number;
  lekScore: number;
  leks: Lek[];
}

export interface LekTypeTotaal {
  type: string;
  naam: string;
  kind: Kans;
  aantal: number;
  geschatteJaarpremie: number;
}

export interface ScanCel {
  label: string;
  leak: boolean;
}

export interface DekkingCategorie {
  lijn: string;
  code: string;
  naam: string;
  actueel: number;
  norm: number;
  toereikend: number;
  vereist: number;
  totaal: number;
}

export interface ScanResultaat {
  scanId: string;
  bron: 'upload' | 'demo';
  aangemaakt: string;
  grid: ScanCel[];
  dekkingZakelijk: DekkingCategorie[];
  totalen: {
    klanten: number;
    polissen: number;
    leks: number;
    klantenMetLek: number;
    geschatteJaarpremie: number;
  };
  perLekType: LekTypeTotaal[];
  klanten: KlantResultaat[];
  leads: Lead[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Serverfout (${res.status})`);
  }
  return res.json();
}

export const api = {
  scanCsv: (csv: string) =>
    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    }).then((r) => handle<ScanResultaat>(r)),

  scanDemo: () => fetch('/api/scan/demo', { method: 'POST' }).then((r) => handle<ScanResultaat>(r)),

  exportUrl: (scanId: string) => `/api/scans/${scanId}/leads.csv`,

  briefUrl: (scanId: string, klantId: string) => `/api/scans/${scanId}/klanten/${klantId}/brief`,
};

// Zelfde notatie als op de website: €24.600 (zonder spatie).
export const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-NL')}`;
