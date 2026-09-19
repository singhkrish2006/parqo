import type { LatLng } from "@/lib/geolocation";

export type { LatLng };

// Both calls go through our own /api routes (see src/app/api) so provider
// keys, the required Nominatim User-Agent and rate limiting live server-side.

export async function geocode(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: number; lng: number };
    return [data.lat, data.lng];
  } catch {
    return null;
  }
}

export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng,
): Promise<LatLng[] | null> {
  try {
    const params = new URLSearchParams({
      from: `${from[0]},${from[1]}`,
      to: `${to[0]},${to[1]}`,
    });
    const res = await fetch(`/api/route?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { path: LatLng[] };
    return data.path;
  } catch {
    return null;
  }
}
