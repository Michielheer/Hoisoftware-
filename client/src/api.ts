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

export type LeadStatus = 'nieuw' | 'benaderd' | 'offerte' | 'gesloten' | 'afgewezen';

export const LEAD_STATUSSEN: LeadStatus[] = ['nieuw', 'benaderd', 'offerte', 'gesloten', 'afgewezen'];

export interface Lead extends Lek {
  leadId: string;
  status: LeadStatus;
  klantId: string;
  klantNaam: string;
  segment: Segment;
  sbiCode: string | null;
}

export interface Opvolging {
  telling: Record<LeadStatus, number>;
  gerealiseerd: number;
  inBehandeling: number;
}

export interface ScanSamenvatting {
  scanId: string;
  bron: 'upload' | 'demo';
  aangemaakt: string;
  totalen: ScanResultaat['totalen'];
  opvolging: Opvolging;
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

  lijst: () => fetch('/api/scans').then((r) => handle<ScanSamenvatting[]>(r)),

  open: (scanId: string) => fetch(`/api/scans/${scanId}`).then((r) => handle<ScanResultaat>(r)),

  zetStatus: (scanId: string, leadId: string, status: LeadStatus) =>
    fetch(`/api/scans/${scanId}/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then((r) => handle<{ lead: Lead; opvolging: Opvolging }>(r)),

  brievenUrl: (scanId: string) => `/api/scans/${scanId}/brieven`,

  exportUrl: (scanId: string) => `/api/scans/${scanId}/leads.csv`,

  briefUrl: (scanId: string, klantId: string) => `/api/scans/${scanId}/klanten/${klantId}/brief`,
};

// Zelfde notatie als op de website: €24.600 (zonder spatie).
export const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-NL')}`;
