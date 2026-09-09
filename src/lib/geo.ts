const EARTH_RADIUS_KM = 6371;

/** Straight-line distance. Informational only — never a hard filter. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number, locale: string): string {
  if (km < 1) {
    const m = Math.round(km * 1000 / 50) * 50;
    return locale === "bn" ? `${m} মিটার` : `${m} m`;
  }
  const value = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return locale === "bn" ? `${value} কিমি` : `${value} km`;
}

/** Anything past this reads as "another city", not "nearby". */
export const FAR_AWAY_KM = 40;
