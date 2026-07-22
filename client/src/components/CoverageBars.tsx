// Het zakelijke staafdiagram uit de Analyse-sectie van de website, gekoppeld
// aan echte data: per categorie de huidige dekking in mint, een coral kap voor
// het tekort tot het normprofiel, en een periwinkle lijn op de norm zelf.
import { useEffect, useRef } from 'react';
import { DekkingCategorie } from '../api';

const DUUR_MS = 1100;
const KLEUR = {
  periwinkle: '#576cdb',
  coral: '#f25a5a',
  mint: '#a6f2d2',
  cloud: '#f9f9fb',
  fog: '#626d88',
  ink: '#1f1f47',
};

interface Props {
  categorieen: DekkingCategorie[];
  runId?: number;
}

export default function CoverageBars({ categorieen, runId = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || categorieen.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

      const padX = 20;
      const padBoven = 26;
      const padOnder = 40;
      const grondY = hoog - padOnder;
      const veldH = grondY - padBoven;
      const n = categorieen.length;
      const slotB = (breed - padX * 2) / n;
      const staafB = Math.min(64, slotB * 0.55);
      // Zachte ease-out zoals de site-animaties.
      const ease = 1 - Math.pow(1 - t, 3);

      categorieen.forEach((cat, i) => {
        const x = padX + slotB * i + (slotB - staafB) / 2;
        const midden = x + staafB / 2;
        const actueelH = veldH * cat.actueel * ease;
        const normH = veldH * cat.norm * ease;

        // Coral kap: het tekort tussen actuele dekking en de norm.
        if (cat.norm > cat.actueel) {
          ctx.beginPath();
          ctx.roundRect(x, grondY - normH, staafB, normH - actueelH, [6, 6, 0, 0]);
          ctx.fillStyle = KLEUR.coral;
          ctx.fill();
        }

        // Mint: huidige (toereikende) dekking.
        if (cat.actueel > 0) {
          ctx.beginPath();
          const bovenrond = cat.actueel >= cat.norm ? [6, 6, 0, 0] : [0, 0, 0, 0];
          ctx.roundRect(x, grondY - actueelH, staafB, actueelH, bovenrond as number[]);
          ctx.fillStyle = KLEUR.mint;
          ctx.fill();
        }

        // Periwinkle normlijn, iets breder dan de staaf.
        ctx.fillStyle = KLEUR.periwinkle;
        ctx.fillRect(x - 6, grondY - normH - 1.5, staafB + 12, 3);

        // Label onder de staaf, percentage erboven.
        ctx.textAlign = 'center';
        ctx.fillStyle = KLEUR.fog;
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.fillText(cat.code, midden, grondY + 18);
        ctx.fillStyle = KLEUR.ink;
        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.fillText(`${Math.round(cat.actueel * 100 * ease)}%`, midden, grondY - Math.max(actueelH, normH) - 8);
      });

      // Grondlijn
      ctx.fillStyle = '#eaedf6';
      ctx.fillRect(padX - 6, grondY, breed - padX * 2 + 12, 1.5);
    };

    const stap = (nu: number) => {
      if (!start) start = nu;
      const t = Math.min(1, (nu - start) / DUUR_MS);
      teken(t);
      if (t < 1) raf = requestAnimationFrame(stap);
    };

    const startAnimatie = () => {
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
      if (breed > 0 && hoog > 0) startAnimatie();
    });
    resize.observe(canvas.parentElement as Element);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
    };
  }, [categorieen, runId]);

  return <canvas ref={canvasRef} />;
}
