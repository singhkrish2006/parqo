export function distanceKm(
  a: [number, number],
  b: [number, number],
): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Flattens lat/lng to local km-offsets around `origin`, accurate enough
 * for the short (~city-scale) distances a route-proximity check needs. */
function toLocalKm(origin: [number, number], p: [number, number]): [number, number] {
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos((origin[0] * Math.PI) / 180);
  return [(p[1] - origin[1]) * kmPerDegLng, (p[0] - origin[0]) * kmPerDegLat];
}

/** Shortest distance (km) from `point` to the polyline through `path`. */
export function distanceToPolylineKm(
  point: [number, number],
  path: [number, number][],
): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return distanceKm(point, path[0]);

  const origin = path[0];
  const p = toLocalKm(origin, point);
  let best = Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    const a = toLocalKm(origin, path[i]);
    const b = toLocalKm(origin, path[i + 1]);
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const lenSq = abx * abx + aby * aby;
    let t = lenSq === 0 ? 0 : ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a[0] + t * abx;
    const cy = a[1] + t * aby;
    const d = Math.hypot(p[0] - cx, p[1] - cy);
    if (d < best) best = d;
  }
  return best;
}
