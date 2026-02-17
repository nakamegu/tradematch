import type { Event } from '@/lib/supabase';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinEventArea(
  userLat: number,
  userLng: number,
  event: Event
): boolean {
  const locations: { lat?: number; lng?: number; radius?: number }[] = [
    { lat: event.latitude, lng: event.longitude, radius: event.radius_km },
    { lat: event.latitude2, lng: event.longitude2, radius: event.radius_km2 },
    { lat: event.latitude3, lng: event.longitude3, radius: event.radius_km3 },
  ];

  const defined = locations.filter(l => l.lat != null && l.lng != null);

  // No location set → allow all
  if (defined.length === 0) return true;

  return defined.some(l =>
    getDistanceKm(userLat, userLng, l.lat!, l.lng!) <= (l.radius ?? 1.0)
  );
}
