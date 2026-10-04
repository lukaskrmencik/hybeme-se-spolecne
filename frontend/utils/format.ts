/** Czech thousands grouping with a non-breaking space: 1245 -> "1 245". Avoids Intl, which is patchy on some devices. */
export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/** 850 -> "850 m", 1240 -> "1,2 km", 12400 -> "12 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = Math.round(meters / 100) / 10;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}
