// De live-scan uit de hero van de website, hier als 2D-canvas en gekoppeld
// aan echte data: elke tegel is een polis, de periwinkle scanbalk veegt over
// het veld, lekken lichten coral op, gedekte polissen kleuren mint.
import { useEffect, useRef } from 'react';

export interface ScanCel {
  leak: boolean;
  label: string;
}

const SCAN_MS = 3000;
const KLEUR = {
  periwinkle: '#576cdb',
  coral: '#f25a5a',
  mint: '#a6f2d2',
  basis: '#dfe3f2', // ongescande cel (licht lila-grijs)
  cloud: '#f9f9fb',
  inkOpMint: '#1f1f47',
};

interface Props {
  cellen: ScanCel[];
  // Loopt elke run van 0 → 1 mee met de scanbalk; voor de tellers ernaast.
  onProgress?: (t: number) => void;
  // Verhoog om opnieuw te scannen.
  runId?: number;
}

export default function ScanCanvas({ cellen, onProgress, runId = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cellen.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = cellen.length;

    let raf = 0;
    let start = 0;
    let breed = 0;
    let hoog = 0;

    const teken = (t: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(breed * dpr) || canvas.height !== Math.round(hoog * dpr)) {
        canvas.width = Math.round(breed * dpr);
        canvas.height = Math.round(hoog * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = KLEUR.cloud;
      ctx.fillRect(0, 0, breed, hoog);

      // Raster dat het aantal polissen volgt (8 kolommen bij ≤48, anders breder).
      const cols = n <= 48 ? 8 : Math.min(14, Math.ceil(Math.sqrt(n * (breed / hoog))));
      const rows = Math.ceil(n / cols);
      const pad = 14;
      const gap = 6;
      const celB = (breed - pad * 2 - gap * (cols - 1)) / cols;
      const celH = (hoog - pad * 2 - gap * (rows - 1)) / rows;
      const scanX = pad + (breed - pad * 2) * t;

      for (let i = 0; i < n; i++) {
        const kol = i % cols;
        const rij = Math.floor(i / cols);
        const x = pad + kol * (celB + gap);
        const y = pad + rij * (celH + gap);
        const midden = x + celB / 2;
        const gescand = t >= 1 || midden <= scanX;
        const cel = cellen[i];

        ctx.beginPath();
        ctx.roundRect(x, y, celB, celH, 6);
        ctx.fillStyle = gescand ? (cel.leak ? KLEUR.coral : KLEUR.mint) : KLEUR.basis;
        ctx.fill();

        if (gescand && celB > 34 && celH > 20) {
          ctx.fillStyle = cel.leak ? '#ffffff' : KLEUR.inkOpMint;
          ctx.font = `600 ${Math.min(11, celH * 0.34)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cel.label, midden, y + celH / 2 + 0.5);
        }
      }

      // Scanbalk met zachte gloed, alleen zolang de scan loopt.
      if (t < 1) {
        const gloed = ctx.createLinearGradient(scanX - 26, 0, scanX + 4, 0);
        gloed.addColorStop(0, 'rgba(87, 108, 219, 0)');
        gloed.addColorStop(1, 'rgba(87, 108, 219, 0.28)');
        ctx.fillStyle = gloed;
        ctx.fillRect(scanX - 26, pad - 4, 30, hoog - pad * 2 + 8);
        ctx.fillStyle = KLEUR.periwinkle;
        ctx.fillRect(scanX, pad - 4, 3, hoog - pad * 2 + 8);
      }

      progressRef.current?.(t);
    };

    const stap = (nu: number) => {
      if (!start) start = nu;
      const t = Math.min(1, (nu - start) / SCAN_MS);
      teken(t);
      if (t < 1) raf = requestAnimationFrame(stap);
    };

    const startScan = () => {
      cancelAnimationFrame(raf);
      start = 0;
      if (reducedMotion) {
        teken(1);
      } else {
        raf = requestAnimationFrame(stap);
      }
    };

    const resize = new ResizeObserver(([entry]) => {
      breed = entry.contentRect.width;
      hoog = entry.contentRect.height;
      if (breed > 0 && hoog > 0) startScan();
    });
    resize.observe(canvas.parentElement as Element);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
    };
  }, [cellen, runId]);

  return <canvas ref={canvasRef} />;
}

// Vaste seed (mulberry32), zelfde patroon als de website-hero (~30% lek).
export function demoCellen(): ScanCel[] {
  const LABELS = ['OP', 'IN', 'AVP', 'AUTO', 'RB', 'BR'];
  let seed = 20260721;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 48 }, () => ({
    leak: rand() < 0.3,
    label: LABELS[Math.floor(rand() * LABELS.length)],
  }));
}
