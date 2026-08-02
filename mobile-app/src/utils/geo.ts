/**
 * Geographic utility functions for WakeStop React Native Mobile App
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the Haversine great-circle distance between two coordinates in meters.
 */
export function getHaversineDistance(coords1: Coordinates, coords2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
  const dLon = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;

  const lat1Rad = (coords1.latitude * Math.PI) / 180;
  const lat2Rad = (coords2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance in meters into human readable text (e.g., "450 m" or "3.2 km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Estimates Transit Arrival Time (ETA) based on average vehicle speed (~45 km/h).
 */
export function calculateETA(distanceMeters: number, averageSpeedKmh: number = 45): string {
  if (distanceMeters <= 50) return 'Arriving Now';
  const speedMetersPerSec = (averageSpeedKmh * 1000) / 3600;
  const totalSeconds = distanceMeters / speedMetersPerSec;

  const minutes = Math.ceil(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

/**
 * Evaluates alarm trigger stage based on current distance (meters)
 */
export type AlarmStage = 'idle' | 'notify' | 'alarm' | 'critical' | 'arrived';

export function evaluateAlarmStage(distanceMeters: number): AlarmStage {
  if (distanceMeters <= 120) return 'arrived';
  if (distanceMeters <= 500) return 'critical';
  if (distanceMeters <= 1000) return 'alarm';
  if (distanceMeters <= 2000) return 'notify';
  return 'idle';
}
