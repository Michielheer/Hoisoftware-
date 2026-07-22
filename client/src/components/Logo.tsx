// HOI-logo, exact overgenomen van de website (Logo.astro):
// mint afgerond vierkant met het donkere merk (balken · cirkel · blok).
export default function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect width="100" height="100" rx="23" fill="#69ebbb" />
      <g fill="#292929" transform="translate(19 36.6) scale(0.4397)">
        <rect x="0" y="0" width="19.2" height="55.5" rx="5.6" />
        <rect x="26.4" y="0" width="19.2" height="55.5" rx="5.6" />
        <circle cx="85.3" cy="27.7" r="22.2" />
        <rect x="116" y="35.8" width="24.7" height="24.7" rx="5.4" />
      </g>
    </svg>
  );
}
