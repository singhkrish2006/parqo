import { describe, expect, it } from "vitest";
import { distanceKm, distanceToPolylineKm } from "@/lib/geo";

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm([28.6, 77.2], [28.6, 77.2])).toBe(0);
  });

  it("measures Connaught Place to India Gate at roughly 2.4 km", () => {
    const d = distanceKm([28.6315, 77.2167], [28.6129, 77.2295]);
    expect(d).toBeGreaterThan(2.0);
    expect(d).toBeLessThan(2.8);
  });
});

describe("distanceToPolylineKm", () => {
  const path: [number, number][] = [
    [28.6, 77.0],
    [28.6, 77.2],
  ];

  it("measures the perpendicular distance to a segment", () => {
    // 0.01 degrees of latitude is about 1.11 km
    expect(distanceToPolylineKm([28.61, 77.1], path)).toBeCloseTo(1.11, 1);
  });

  it("measures to the nearest endpoint beyond the ends", () => {
    const beyond = distanceToPolylineKm([28.6, 77.3], path);
    const direct = distanceKm([28.6, 77.3], [28.6, 77.2]);
    expect(beyond).toBeCloseTo(direct, 1);
  });

  it("handles degenerate paths", () => {
    expect(distanceToPolylineKm([28.6, 77.0], [])).toBe(Infinity);
    expect(distanceToPolylineKm([28.6, 77.0], [[28.6, 77.0]])).toBe(0);
  });
});
