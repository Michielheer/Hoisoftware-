// Persistente opslag van scans en lead-opvolging (JSON-bestand op schijf).
// Zo overleeft een scan de browsersessie en kan het conversieproject laten
// zien wat het belooft: geschatte omzet naast gerealiseerde omzet.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const LEAD_STATUSSEN = ['nieuw', 'benaderd', 'offerte', 'gesloten', 'afgewezen'];

const MAX_SCANS = 50;

// Opvolg-samenvatting van één scan: telling per status plus de premie die
// gerealiseerd is (gesloten) en in behandeling is (benaderd/offerte).
export function opvolging(scan) {
  const telling = Object.fromEntries(LEAD_STATUSSEN.map((s) => [s, 0]));
  let gerealiseerd = 0;
  let inBehandeling = 0;
  for (const lead of scan.leads) {
    telling[lead.status] += 1;
    if (lead.status === 'gesloten') gerealiseerd += lead.geschatteJaarpremie;
    if (lead.status === 'benaderd' || lead.status === 'offerte') inBehandeling += lead.geschatteJaarpremie;
  }
  return { telling, gerealiseerd, inBehandeling };
}

export class ScanStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.scans = [];
    this.schrijfKetting = Promise.resolve();
  }

  async load() {
    try {
      this.scans = JSON.parse(await readFile(this.filePath, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.scans = [];
    }
  }

  // Atomair (tmp-bestand + rename) en geserialiseerd: gelijktijdige
  // status-updates kunnen het databestand nooit half of door elkaar schrijven.
  save() {
    this.schrijfKetting = this.schrijfKetting.then(async () => {
      const tmp = `${this.filePath}.tmp`;
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(tmp, JSON.stringify(this.scans));
      await rename(tmp, this.filePath);
    });
    return this.schrijfKetting;
  }

  async voegToe(scan) {
    this.scans.unshift(scan);
    if (this.scans.length > MAX_SCANS) this.scans.length = MAX_SCANS;
    await this.save();
    return scan;
  }

  get(id) {
    return this.scans.find((s) => s.scanId === id) ?? null;
  }

  lijst() {
    return this.scans.map((s) => ({
      scanId: s.scanId,
      bron: s.bron,
      aangemaakt: s.aangemaakt,
      totalen: s.totalen,
      opvolging: opvolging(s),
    }));
  }

  async zetStatus(scanId, leadId, status) {
    const scan = this.get(scanId);
    if (!scan) return null;
    const lead = scan.leads.find((l) => l.leadId === leadId);
    if (!lead) return null;
    lead.status = status;
    await this.save();
    return scan;
  }
}
