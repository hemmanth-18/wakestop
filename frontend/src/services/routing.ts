export interface RouteResult {
  coordinates: [number, number][]; // Array of [lat, lng] for Leaflet
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Fetches actual driving route geometry and road distance using OSRM.
 */
export async function fetchOsrmRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    // OSRM returns GeoJSON coordinates as [lng, lat]. Leaflet expects [lat, lng].
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    return {
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (err) {
    console.warn("OSRM routing fetch failed, falling back to direct line:", err);
    return null;
  }
}
