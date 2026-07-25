export function distanceMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

// Rough ETA assuming a long-distance bus average speed of ~45 km/h.
// This is a placeholder — swap for OSRM route-duration once route snapping is added.
export function estimateEtaMinutes(m: number, avgSpeedKmh = 45): number {
  const km = m / 1000;
  return Math.round((km / avgSpeedKmh) * 60);
}
