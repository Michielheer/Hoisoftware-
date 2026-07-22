// Zelfde euronotatie als de website: €24.600 (zonder spatie).
export function euro(n) {
  return `€${Math.round(n).toLocaleString('nl-NL')}`;
}
