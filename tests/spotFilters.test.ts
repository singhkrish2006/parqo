import { describe, expect, it } from "vitest";
import type { Spot } from "@/data/spots";
import { destinationLooksFull, matchesCategory, rankSpots } from "@/lib/spotFilters";

function makeSpot(overrides: Partial<Spot> & Pick<Spot, "id">): Spot {
  return {
    name: overrides.id,
    lat: 28.6,
    lng: 77.2,
    status: "open",
    verified: false,
    type: "On-street parking",
    ownership: "public",
    pricePerHour: 20,
    priceNote: "",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    availability: null,
    ...overrides,
  };
}

const origin: [number, number] = [28.6, 77.2];
const none = new Set<string>();

describe("matchesCategory", () => {
  const priv = makeSpot({ id: "p", ownership: "private", charging: true, status: "full" });

  it("filters by ownership, charging, status and watchlist", () => {
    expect(matchesCategory(priv, "private", none)).toBe(true);
    expect(matchesCategory(priv, "public", none)).toBe(false);
    expect(matchesCategory(priv, "charging", none)).toBe(true);
    expect(matchesCategory(priv, "open", none)).toBe(false);
    expect(matchesCategory(priv, "watching", new Set(["p"]))).toBe(true);
    expect(matchesCategory(priv, "watching", none)).toBe(false);
    expect(matchesCategory(priv, "all", none)).toBe(true);
  });
});

describe("rankSpots", () => {
  const near = makeSpot({ id: "near", lat: 28.601, pricePerHour: 40 });
  const mid = makeSpot({ id: "mid", lat: 28.61, pricePerHour: 20 });
  const far = makeSpot({ id: "far", lat: 28.7, pricePerHour: 0 });
  const spots = [far, near, mid];

  const base = { origin, routePath: null, watchedIds: none, categoryFilter: "all" as const };

  it("sorts nearest first", () => {
    const ids = rankSpots({ ...base, spots, sortMode: "nearest" }).map((s) => s.id);
    expect(ids).toEqual(["near", "mid", "far"]);
  });

  it("sorts cheapest first, breaking price ties by distance", () => {
    const tie = makeSpot({ id: "tie", lat: 28.62, pricePerHour: 20 });
    const ids = rankSpots({ ...base, spots: [...spots, tie], sortMode: "cheapest" }).map(
      (s) => s.id,
    );
    expect(ids).toEqual(["far", "mid", "tie", "near"]);
  });

  it("does not mutate the input array", () => {
    const input = [far, near, mid];
    rankSpots({ ...base, spots: input, sortMode: "nearest" });
    expect(input.map((s) => s.id)).toEqual(["far", "near", "mid"]);
  });

  it("keeps only spots near the route, ordered by closeness to it", () => {
    const path: [number, number][] = [
      [28.6, 77.2],
      [28.62, 77.2],
    ];
    const onRoute = makeSpot({ id: "on", lat: 28.61, lng: 77.2 });
    const beside = makeSpot({ id: "beside", lat: 28.61, lng: 77.205 });
    const offRoute = makeSpot({ id: "off", lat: 28.7, lng: 77.3 });
    const ids = rankSpots({
      ...base,
      spots: [offRoute, beside, onRoute],
      sortMode: "nearest",
      routePath: path,
    }).map((s) => s.id);
    expect(ids).toEqual(["on", "beside"]);
  });
});

describe("destinationLooksFull", () => {
  const destination = { lat: 28.6, lng: 77.2 };

  it("is true only when nearby spots exist and none are open", () => {
    const full = makeSpot({ id: "a", status: "full" });
    const limited = makeSpot({ id: "b", status: "limited" });
    const open = makeSpot({ id: "c", status: "open" });
    expect(destinationLooksFull([full, limited], destination)).toBe(true);
    expect(destinationLooksFull([full, open], destination)).toBe(false);
    expect(destinationLooksFull([], destination)).toBe(false);
  });

  it("ignores spots outside the corridor", () => {
    const farFull = makeSpot({ id: "x", status: "full", lat: 28.9 });
    expect(destinationLooksFull([farFull], destination)).toBe(false);
  });
});
