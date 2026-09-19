import type { Spot } from "@/data/spots";
import { distanceKm, distanceToPolylineKm } from "@/lib/geo";

export type CategoryFilter =
  | "all"
  | "public"
  | "private"
  | "charging"
  | "open"
  | "watching";
export type SortMode = "nearest" | "cheapest";

/** How far from a route (or a destination) still counts as "on the way". */
export const ROUTE_CORRIDOR_KM = 1.2;

export function matchesCategory(
  spot: Spot,
  filter: CategoryFilter,
  watchedIds: ReadonlySet<string>,
): boolean {
  switch (filter) {
    case "public":
      return spot.ownership === "public";
    case "private":
      return spot.ownership === "private";
    case "charging":
      return spot.charging;
    case "open":
      return spot.status === "open";
    case "watching":
      return watchedIds.has(spot.id);
    default:
      return true;
  }
}

export function rankSpots(opts: {
  spots: Spot[];
  categoryFilter: CategoryFilter;
  sortMode: SortMode;
  origin: [number, number];
  routePath: [number, number][] | null;
  watchedIds: ReadonlySet<string>;
}): Spot[] {
  const { spots, categoryFilter, sortMode, origin, routePath, watchedIds } = opts;
  const filtered = spots.filter((s) => matchesCategory(s, categoryFilter, watchedIds));

  if (routePath && routePath.length > 1) {
    return filtered
      .map((s) => ({ spot: s, d: distanceToPolylineKm([s.lat, s.lng], routePath) }))
      .filter((x) => x.d <= ROUTE_CORRIDOR_KM)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.spot);
  }

  return filtered.sort((a, b) => {
    if (sortMode === "cheapest" && a.pricePerHour !== b.pricePerHour) {
      return a.pricePerHour - b.pricePerHour;
    }
    return (
      distanceKm(origin, [a.lat, a.lng]) - distanceKm(origin, [b.lat, b.lng])
    );
  });
}

/** True when there are spots around the destination and none are open. */
export function destinationLooksFull(
  spots: Spot[],
  destination: { lat: number; lng: number },
): boolean {
  const nearby = spots.filter(
    (s) =>
      distanceKm([destination.lat, destination.lng], [s.lat, s.lng]) <=
      ROUTE_CORRIDOR_KM,
  );
  return nearby.length > 0 && nearby.every((s) => s.status !== "open");
}
