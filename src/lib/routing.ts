// Both services below are free, keyless public demo servers — fine for
// low-traffic dev/personal use. Before real launch traffic, self-host OSRM
// and run geocoding through your own backend (Nominatim's usage policy caps
// direct client-side use at ~1 request/second and asks for a real contact
// email in a custom User-Agent, which a browser can't set).

export type LatLng = [number, number];

/** Delhi-biased geocoding via OpenStreetMap Nominatim. */
export async function geocode(query: string): Promise<LatLng | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("viewbox", "76.8,28.9,77.6,28.3");
  url.searchParams.set("bounded", "0");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const results = (await res.json()) as { lat: string; lon: string }[];
  if (results.length === 0) return null;
  return [parseFloat(results[0].lat), parseFloat(results[0].lon)];
}

/** Driving route between two points via the public OSRM demo server. */
export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng,
): Promise<LatLng[] | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const coords = data?.routes?.[0]?.geometry?.coordinates as
    | [number, number][]
    | undefined;
  if (!coords) return null;
  return coords.map(([lng, lat]) => [lat, lng]);
}
