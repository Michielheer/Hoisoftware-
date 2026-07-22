// Scroll-reveal en kaart-tilt, overgenomen van de website (vanilla JS).
// Aanroepen na elke view-wissel; geeft een cleanup-functie terug.

export function initEffects(): () => void {
  document.documentElement.classList.add('js');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups: Array<() => void> = [];

  // Scroll-reveal
  const revealElementen = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
  if (reducedMotion) {
    revealElementen.forEach((el) => el.classList.add('is-visible'));
  } else if (revealElementen.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      // threshold 0: ook heel hoge elementen (zoals de leads-tabel) onthullen
      // zodra hun eerste pixels in beeld komen.
      { threshold: 0, rootMargin: '0px 0px -40px 0px' },
    );
    revealElementen.forEach((el) => observer.observe(el));
    cleanups.push(() => observer.disconnect());
  }

  // Kaart-tilt: pointer zet --tilt-x/--tilt-y (max ±4°), zoals op de site.
  if (!reducedMotion) {
    const tiltElementen = Array.from(document.querySelectorAll<HTMLElement>('.tilt'));
    for (const el of tiltElementen) {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(x * 4).toFixed(2)}deg`);
      };
      const leave = () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      });
    }
  }

  return () => cleanups.forEach((fn) => fn());
}
